use crate::{app::App, docker::format_bytes};
use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    symbols,
    text::{Line, Span},
    widgets::{
        Axis, Block, Borders, Cell, Chart, Dataset, GraphType, Paragraph, Row, Table, TableState,
    },
    Frame,
};

pub fn draw(f: &mut Frame, app: &App) {
    let area = f.area();

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // header
            Constraint::Min(8),     // table
            Constraint::Length(16), // charts
            Constraint::Length(3),  // footer
        ])
        .split(area);

    draw_header(f, chunks[0], app);
    draw_table(f, chunks[1], app);
    draw_charts(f, chunks[2], app);
    draw_footer(f, chunks[3], app);
}

fn draw_header(f: &mut Frame, area: Rect, app: &App) {
    let title = format!(" Docker TUI — {} ", app.title);
    let header = Paragraph::new(title)
        .style(Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(header, area);
}

fn draw_table(f: &mut Frame, area: Rect, app: &App) {
    let header_cells = [
        "Container", "Status", "CPU %", "MEM Usage", "MEM %", "NET I/O", "BLOCK I/O",
    ]
    .iter()
    .map(|h| {
        Cell::from(*h).style(
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
        )
    });

    let header_row = Row::new(header_cells).height(1).bottom_margin(1);

    let rows: Vec<Row> = app
        .containers
        .iter()
        .enumerate()
        .map(|(i, c)| {
            let is_selected = i == app.selected;
            let base_style = if is_selected {
                Style::default().bg(Color::DarkGray).fg(Color::White)
            } else {
                Style::default()
            };

            let net_io = format!("{} / {}", format_bytes(c.net_rx), format_bytes(c.net_tx));
            let block_io = format!(
                "{} / {}",
                format_bytes(c.block_read),
                format_bytes(c.block_write)
            );

            Row::new(vec![
                Cell::from(truncate(&c.name, 30)).style(base_style),
                Cell::from(c.status.clone()).style(status_style(&c.status, is_selected)),
                Cell::from(format!("{:.2}%", c.cpu_percent))
                    .style(cpu_color(c.cpu_percent, is_selected)),
                Cell::from(format!(
                    "{} / {}",
                    format_bytes(c.mem_usage),
                    format_bytes(c.mem_limit)
                ))
                .style(base_style),
                Cell::from(format!("{:.2}%", c.mem_percent()))
                    .style(mem_color(c.mem_percent(), is_selected)),
                Cell::from(net_io).style(base_style),
                Cell::from(block_io).style(base_style),
            ])
            .height(1)
        })
        .collect();

    let widths = [
        Constraint::Length(30),
        Constraint::Length(10),
        Constraint::Length(8),
        Constraint::Length(22),
        Constraint::Length(8),
        Constraint::Length(24),
        Constraint::Length(24),
    ];

    let table = Table::new(rows, widths)
        .header(header_row)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Containers "),
        )
        .row_highlight_style(Style::default().add_modifier(Modifier::BOLD))
        .highlight_symbol("▶ ");

    let mut state = TableState::default();
    if !app.containers.is_empty() {
        state.select(Some(app.selected));
    }

    f.render_stateful_widget(table, area, &mut state);

    if app.containers.is_empty() {
        let inner = Rect {
            x: area.x + 2,
            y: area.y + 3,
            width: area.width.saturating_sub(4),
            height: 1,
        };
        f.render_widget(
            Paragraph::new("No running containers found.")
                .style(Style::default().fg(Color::DarkGray)),
            inner,
        );
    }
}

fn draw_charts(f: &mut Frame, area: Rect, app: &App) {
    let halves = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area);

    let (container_name, cpu_data, mem_data, cpu_now, mem_now) =
        if let (Some(c), Some(h)) = (app.selected_container(), app.selected_history()) {
            (
                c.name.clone(),
                h.cpu_data(),
                h.mem_data(),
                c.cpu_percent,
                c.mem_percent(),
            )
        } else {
            return;
        };

    // x-axis spans the actual number of collected points so the line fills the chart
    let x_max = (cpu_data.len().max(2) - 1) as f64;

    // y-axis: auto-scale based on the recent peak (last 10 points) so the axis
    // adapts quickly after spikes pass, rather than staying at 100% for 2 minutes.
    let recent_peak = |data: &[(f64, f64)]| -> f64 {
        let start = data.len().saturating_sub(10);
        data[start..].iter().map(|(_, v)| *v).fold(0f64, f64::max)
    };
    let cpu_peak = recent_peak(&cpu_data);
    let mem_peak = recent_peak(&mem_data);
    let cpu_ceil = (cpu_peak * 1.4).max(5.0).min(100.0);
    let mem_ceil = (mem_peak * 1.4).max(5.0).min(100.0);

    let cpu_mid = format!("{:.0}%", cpu_ceil / 2.0);
    let cpu_top = format!("{:.0}%", cpu_ceil);
    let mem_mid = format!("{:.0}%", mem_ceil / 2.0);
    let mem_top = format!("{:.0}%", mem_ceil);

    // CPU chart
    let cpu_dataset = Dataset::default()
        .name(format!("CPU  {cpu_now:.1}%"))
        .marker(symbols::Marker::Braille)
        .graph_type(GraphType::Line)
        .style(Style::default().fg(cpu_fg(cpu_now)))
        .data(&cpu_data);

    let cpu_chart = Chart::new(vec![cpu_dataset])
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(format!(" CPU — {container_name} ")),
        )
        .x_axis(
            Axis::default()
                .style(Style::default().fg(Color::DarkGray))
                .bounds([0.0, x_max])
                .labels(x_labels(cpu_data.len())),
        )
        .y_axis(
            Axis::default()
                .style(Style::default().fg(Color::DarkGray))
                .bounds([0.0, cpu_ceil])
                .labels(["0%", &cpu_mid, &cpu_top].map(Span::raw)),
        );

    f.render_widget(cpu_chart, halves[0]);

    // Memory chart
    let mem_dataset = Dataset::default()
        .name(format!("MEM  {mem_now:.1}%"))
        .marker(symbols::Marker::Braille)
        .graph_type(GraphType::Line)
        .style(Style::default().fg(mem_fg(mem_now)))
        .data(&mem_data);

    let mem_chart = Chart::new(vec![mem_dataset])
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(format!(" Memory — {container_name} ")),
        )
        .x_axis(
            Axis::default()
                .style(Style::default().fg(Color::DarkGray))
                .bounds([0.0, x_max])
                .labels(x_labels(mem_data.len())),
        )
        .y_axis(
            Axis::default()
                .style(Style::default().fg(Color::DarkGray))
                .bounds([0.0, mem_ceil])
                .labels(["0%", &mem_mid, &mem_top].map(Span::raw)),
        );

    f.render_widget(mem_chart, halves[1]);
}

fn draw_footer(f: &mut Frame, area: Rect, app: &App) {
    let content = if let Some(err) = &app.error {
        Line::from(vec![
            Span::styled(
                " Error: ",
                Style::default().fg(Color::Red).add_modifier(Modifier::BOLD),
            ),
            Span::raw(err.as_str()),
        ])
    } else {
        Line::from(vec![
            Span::styled(" ↑/k ", Style::default().fg(Color::Cyan)),
            Span::raw("up  "),
            Span::styled("↓/j ", Style::default().fg(Color::Cyan)),
            Span::raw("down  "),
            Span::styled("q ", Style::default().fg(Color::Cyan)),
            Span::raw("quit  "),
            Span::styled("auto-refresh: 3s", Style::default().fg(Color::DarkGray)),
        ])
    };

    f.render_widget(
        Paragraph::new(content).block(Block::default().borders(Borders::ALL)),
        area,
    );
}

fn cpu_fg(percent: f64) -> Color {
    if percent >= 80.0 {
        Color::Red
    } else if percent >= 50.0 {
        Color::Yellow
    } else {
        Color::Green
    }
}

fn mem_fg(percent: f64) -> Color {
    if percent >= 80.0 {
        Color::Red
    } else if percent >= 60.0 {
        Color::Yellow
    } else {
        Color::Cyan
    }
}

fn cpu_color(percent: f64, selected: bool) -> Style {
    let s = Style::default().fg(cpu_fg(percent));
    if selected { s.bg(Color::DarkGray) } else { s }
}

fn mem_color(percent: f64, selected: bool) -> Style {
    let s = Style::default().fg(mem_fg(percent));
    if selected { s.bg(Color::DarkGray) } else { s }
}

fn status_style(status: &str, selected: bool) -> Style {
    let lower = status.to_lowercase();
    let fg = if lower.contains("running") {
        Color::Green
    } else if lower.contains("exited") || lower.contains("dead") {
        Color::Red
    } else {
        Color::Yellow
    };
    let s = Style::default().fg(fg);
    if selected { s.bg(Color::DarkGray) } else { s }
}

fn x_labels(n: usize) -> [Span<'static>; 3] {
    let secs = n as u64 * 3; // 3s tick rate
    let mid = secs / 2;
    let oldest = if secs >= 60 {
        format!("{}m ago", secs / 60)
    } else {
        format!("{secs}s ago")
    };
    let midlabel = if mid >= 60 {
        format!("{}m ago", mid / 60)
    } else {
        format!("{mid}s ago")
    };
    [Span::raw(oldest), Span::raw(midlabel), Span::raw("now")]
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}…", &s[..max - 1])
    }
}
