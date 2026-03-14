use crate::{
    app::{App, ContainerHistory},
    docker::format_bytes,
};
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
            Constraint::Min(6),    // table
            Constraint::Length(24), // 2×2 chart grid (two rows of 12)
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
                    .style(color_for(c.cpu_percent, 50.0, 80.0, is_selected)),
                Cell::from(format!(
                    "{} / {}",
                    format_bytes(c.mem_usage),
                    format_bytes(c.mem_limit)
                ))
                .style(base_style),
                Cell::from(format!("{:.2}%", c.mem_percent()))
                    .style(color_for(c.mem_percent(), 60.0, 80.0, is_selected)),
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
    let (container, hist) = match (app.selected_container(), app.selected_history()) {
        (Some(c), Some(h)) => (c, h),
        _ => return,
    };
    let name = &container.name;

    // 2×2 grid
    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area);
    let top = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(rows[0]);
    let bot = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(rows[1]);

    // CPU chart (percent)
    let cpu_data = ContainerHistory::indexed(&hist.cpu);
    draw_percent_chart(
        f,
        top[0],
        &format!(" CPU — {name} "),
        &cpu_data,
        container.cpu_percent,
        "CPU",
        Color::Green,
        app.tick_secs,
    );

    // Memory chart (percent)
    let mem_data = ContainerHistory::indexed(&hist.mem);
    draw_percent_chart(
        f,
        top[1],
        &format!(" Memory — {name} "),
        &mem_data,
        container.mem_percent(),
        "MEM",
        Color::Cyan,
        app.tick_secs,
    );

    // Network I/O chart (bytes/s, two lines: rx + tx)
    let rx_data = ContainerHistory::indexed(&hist.net_rx_rate);
    let tx_data = ContainerHistory::indexed(&hist.net_tx_rate);
    draw_rate_chart(
        f,
        bot[0],
        &format!(" Network — {name} "),
        &rx_data,
        &tx_data,
        "RX",
        "TX",
        Color::Magenta,
        Color::Yellow,
        app.tick_secs,
    );

    // Disk I/O chart (bytes/s, two lines: read + write)
    let dr_data = ContainerHistory::indexed(&hist.disk_read_rate);
    let dw_data = ContainerHistory::indexed(&hist.disk_write_rate);
    draw_rate_chart(
        f,
        bot[1],
        &format!(" Disk — {name} "),
        &dr_data,
        &dw_data,
        "Read",
        "Write",
        Color::Blue,
        Color::Red,
        app.tick_secs,
    );
}

/// Draws a single-line chart scaled as a percentage (CPU, MEM).
fn draw_percent_chart(
    f: &mut Frame,
    area: Rect,
    title: &str,
    data: &[(f64, f64)],
    current: f64,
    label: &str,
    color: Color,
    tick_secs: f64,
) {
    if data.is_empty() {
        return;
    }
    let x_max = (data.len().max(2) - 1) as f64;
    let peak = recent_peak(data, 10);
    let ceil = (peak * 1.4).max(5.0).min(100.0);
    let mid = format!("{:.0}%", ceil / 2.0);
    let top = format!("{:.0}%", ceil);

    let dataset = Dataset::default()
        .name(format!("{label}  {current:.1}%"))
        .marker(symbols::Marker::Braille)
        .graph_type(GraphType::Line)
        .style(Style::default().fg(color))
        .data(data);

    let chart = Chart::new(vec![dataset])
        .block(Block::default().borders(Borders::ALL).title(title))
        .x_axis(
            Axis::default()
                .style(Style::default().fg(Color::DarkGray))
                .bounds([0.0, x_max])
                .labels(x_labels(data.len(), tick_secs)),
        )
        .y_axis(
            Axis::default()
                .style(Style::default().fg(Color::DarkGray))
                .bounds([0.0, ceil])
                .labels(["0%", &mid, &top].map(Span::raw)),
        );

    f.render_widget(chart, area);

    // Current value badge in top-right
    let badge_text = format!(" {current:.1}% ");
    draw_value_badge(f, area, &badge_text, color);
}

/// Draws a dual-line chart scaled in bytes/s (Network, Disk).
fn draw_rate_chart(
    f: &mut Frame,
    area: Rect,
    title: &str,
    line1: &[(f64, f64)],
    line2: &[(f64, f64)],
    label1: &str,
    label2: &str,
    color1: Color,
    color2: Color,
    tick_secs: f64,
) {
    if line1.is_empty() {
        return;
    }
    let x_max = (line1.len().max(2) - 1) as f64;

    let peak1 = recent_peak(line1, 10);
    let peak2 = recent_peak(line2, 10);
    let peak = peak1.max(peak2);
    let ceil = if peak < 1.0 { 1024.0 } else { peak * 1.4 }; // min 1 KB/s

    let now1 = line1.last().map(|(_, v)| *v).unwrap_or(0.0);
    let now2 = line2.last().map(|(_, v)| *v).unwrap_or(0.0);

    let mid_label = format_rate(ceil / 2.0);
    let top_label = format_rate(ceil);

    let ds1 = Dataset::default()
        .name(format!("{label1} {}/s", format_rate(now1)))
        .marker(symbols::Marker::Braille)
        .graph_type(GraphType::Line)
        .style(Style::default().fg(color1))
        .data(line1);

    let ds2 = Dataset::default()
        .name(format!("{label2} {}/s", format_rate(now2)))
        .marker(symbols::Marker::Braille)
        .graph_type(GraphType::Line)
        .style(Style::default().fg(color2))
        .data(line2);

    let chart = Chart::new(vec![ds1, ds2])
        .block(Block::default().borders(Borders::ALL).title(title))
        .x_axis(
            Axis::default()
                .style(Style::default().fg(Color::DarkGray))
                .bounds([0.0, x_max])
                .labels(x_labels(line1.len(), tick_secs)),
        )
        .y_axis(
            Axis::default()
                .style(Style::default().fg(Color::DarkGray))
                .bounds([0.0, ceil])
                .labels(["0", &mid_label, &top_label].map(Span::raw)),
        );

    f.render_widget(chart, area);

    // Current values badge in top-right
    let badge_text = format!(" {label1} {}/s | {label2} {}/s ", format_rate(now1), format_rate(now2));
    // Use the first line's color for the badge
    draw_value_badge(f, area, &badge_text, color1);
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
            Span::styled("auto-refresh: 2s", Style::default().fg(Color::DarkGray)),
        ])
    };

    f.render_widget(
        Paragraph::new(content).block(Block::default().borders(Borders::ALL)),
        area,
    );
}

/// Renders a small bordered box with the current value in the top-right of the chart area.
fn draw_value_badge(f: &mut Frame, chart_area: Rect, text: &str, fg: Color) {
    let w = text.len() as u16 + 2; // +2 for border
    let h = 3u16;
    // Position: inside chart border, top-right corner
    if chart_area.width < w + 2 || chart_area.height < h + 1 {
        return;
    }
    let badge_area = Rect {
        x: chart_area.x + chart_area.width - w - 1,
        y: chart_area.y + 1,
        width: w,
        height: h,
    };
    let badge = Paragraph::new(text)
        .style(
            Style::default()
                .fg(fg)
                .add_modifier(Modifier::BOLD),
        )
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::DarkGray)),
        );
    f.render_widget(badge, badge_area);
}

// --- helpers ---

fn recent_peak(data: &[(f64, f64)], window: usize) -> f64 {
    let start = data.len().saturating_sub(window);
    data[start..].iter().map(|(_, v)| *v).fold(0f64, f64::max)
}

fn format_rate(bytes_per_sec: f64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;

    if bytes_per_sec >= GB {
        format!("{:.1}GB", bytes_per_sec / GB)
    } else if bytes_per_sec >= MB {
        format!("{:.1}MB", bytes_per_sec / MB)
    } else if bytes_per_sec >= KB {
        format!("{:.1}KB", bytes_per_sec / KB)
    } else {
        format!("{:.0}B", bytes_per_sec)
    }
}

fn x_labels(n: usize, tick_secs: f64) -> [Span<'static>; 3] {
    let secs = (n as f64 * tick_secs) as u64;
    let mid = secs / 2;
    let fmt = |s: u64| -> String {
        if s >= 60 {
            format!("{}m ago", s / 60)
        } else {
            format!("{s}s ago")
        }
    };
    [Span::raw(fmt(secs)), Span::raw(fmt(mid)), Span::raw("now")]
}

fn color_for(val: f64, warn: f64, crit: f64, selected: bool) -> Style {
    let fg = if val >= crit {
        Color::Red
    } else if val >= warn {
        Color::Yellow
    } else {
        Color::Green
    };
    let s = Style::default().fg(fg);
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

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}…", &s[..max - 1])
    }
}
