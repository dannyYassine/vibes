mod app;
mod docker;
mod ui;

use anyhow::{Context, Result};
use app::App;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use std::{
    io,
    time::{Duration, Instant},
};

const TICK_RATE: Duration = Duration::from_millis(3000);

#[tokio::main]
async fn main() -> Result<()> {
    let compose_file = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "docker-compose.yml".to_string());

    // Init Docker BEFORE touching the terminal so errors print cleanly
    let mut app = App::new(&compose_file)
        .await
        .context("Failed to initialise Docker client")?;

    // Setup terminal
    enable_raw_mode().context("enable_raw_mode failed")?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)
        .context("Failed to enter alternate screen")?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let res = run(&mut terminal, &mut app).await;

    // Always restore terminal
    let _ = disable_raw_mode();
    let _ = execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    );
    let _ = terminal.show_cursor();

    res
}

async fn run(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    app: &mut App,
) -> Result<()> {
    let mut last_tick = Instant::now();

    loop {
        terminal.draw(|f| ui::draw(f, app))?;

        let timeout = TICK_RATE.saturating_sub(last_tick.elapsed());

        if event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    match key.code {
                        KeyCode::Char('q') | KeyCode::Esc => return Ok(()),
                        KeyCode::Down | KeyCode::Char('j') => app.next(),
                        KeyCode::Up | KeyCode::Char('k') => app.previous(),
                        _ => {}
                    }
                }
            }
        }

        if last_tick.elapsed() >= TICK_RATE {
            app.refresh().await;
            last_tick = Instant::now();
        }
    }
}
