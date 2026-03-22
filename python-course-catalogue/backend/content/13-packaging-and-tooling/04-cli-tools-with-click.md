---
title: "Building CLI Tools with Click"
description: "Build professional command-line interfaces with Click's decorator-based API."
duration_minutes: 30
order: 4
---

## Why Click Instead of argparse?

Python's standard library includes `argparse`, which is capable but verbose and has rough edges. Click (Command Line Interface Creation Kit) is the gold standard for building CLIs in Python.

**Click advantages:**
- **Composable**: commands nest naturally into groups (like `git`, `docker`)
- **Testable**: built-in `CliRunner` for testing without subprocess calls
- **Less boilerplate**: decorators describe the interface cleanly
- **Better UX**: automatic help generation, type conversion, error messages
- **Context management**: pass state between nested commands cleanly

```bash
pip install click
```

---

## Basic Command

The simplest Click command is a Python function decorated with `@click.command()`:

```python
# hello.py
import click

@click.command()
def hello():
    """A simple greeting command."""
    click.echo("Hello, World!")

if __name__ == '__main__':
    hello()
```

```bash
python hello.py
# Hello, World!

python hello.py --help
# Usage: hello.py [OPTIONS]
#
#   A simple greeting command.
#
# Options:
#   --help  Show this message and exit.
```

Click automatically generates `--help` from the function's docstring.

---

## Options: @click.option()

Options are keyword-style arguments passed with `--name value`.

```python
import click

@click.command()
@click.option('--name', default='World', help='Name to greet.')
@click.option('--count', default=1, type=int, help='How many times to greet.')
@click.option('--shout', is_flag=True, help='Output in uppercase.')
def greet(name, count, shout):
    """Greet someone, optionally multiple times."""
    message = f"Hello, {name}!"
    if shout:
        message = message.upper()
    for _ in range(count):
        click.echo(message)

if __name__ == '__main__':
    greet()
```

```bash
python greet.py --name Alice --count 3
# Hello, Alice!
# Hello, Alice!
# Hello, Alice!

python greet.py --name Bob --shout
# HELLO, BOB!

python greet.py --help
# Usage: greet.py [OPTIONS]
#
#   Greet someone, optionally multiple times.
#
# Options:
#   --name TEXT     Name to greet.
#   --count INTEGER How many times to greet.
#   --shout         Output in uppercase.
#   --help          Show this message and exit.
```

### Option Types

```python
import click

@click.command()
# String (default)
@click.option('--name', type=str)

# Integer
@click.option('--port', type=int, default=8080)

# Float
@click.option('--rate', type=float)

# Boolean flag
@click.option('--verbose', is_flag=True)

# Choice: restricted set of values
@click.option('--format', type=click.Choice(['json', 'csv', 'table'], case_sensitive=False))

# Path: validates the path exists
@click.option('--config', type=click.Path(exists=True, file_okay=True, dir_okay=False))

# File: opens the file automatically
@click.option('--output', type=click.File('w'), default='-')  # '-' means stdout

# Multiple values: pass the flag multiple times
@click.option('--tag', multiple=True)

# Tuple of values in one flag
@click.option('--point', nargs=2, type=float)

def process(name, port, rate, verbose, format, config, output, tag, point):
    pass
```

### Required Options

```python
@click.command()
@click.option('--api-key', required=True, envvar='MY_API_KEY',
              help='API key (or set MY_API_KEY env var).')
def deploy(api_key):
    click.echo(f"Deploying with key: {api_key[:4]}...")
```

`envvar` lets users set the value via environment variable instead of passing it on the command line — essential for secrets in CI/CD.

### Short and Long Option Names

```python
@click.command()
@click.option('-v', '--verbose', is_flag=True, help='Enable verbose output.')
@click.option('-o', '--output', default='result.txt', help='Output file.')
@click.option('-n', '--count', default=10, type=int)
def run(verbose, output, count):
    pass
```

```bash
python script.py -v -o out.txt -n 5
python script.py --verbose --output out.txt --count 5
```

### Prompting for Input

```python
@click.command()
@click.option('--username', prompt=True)
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True)
def create_account(username, password):
    click.echo(f"Creating account for {username}")
```

```bash
python create.py
# Username: alice
# Password: (hidden)
# Repeat for confirmation: (hidden)
# Creating account for alice

# Or pass on command line to skip prompting
python create.py --username alice --password secret
```

---

## Arguments: @click.argument()

Arguments are positional — they must appear in order without `--name`:

```python
@click.command()
@click.argument('source')
@click.argument('destination')
def copy(source, destination):
    """Copy SOURCE to DESTINATION."""
    click.echo(f"Copying {source} → {destination}")
```

```bash
python copy.py file.txt /tmp/file.txt
```

### Variadic Arguments

```python
@click.command()
@click.argument('files', nargs=-1, required=True)  # Accept one or more
def process(files):
    """Process one or more FILES."""
    for f in files:
        click.echo(f"Processing {f}")
```

```bash
python process.py a.txt b.txt c.txt
```

---

## click.echo() and Styled Output

`click.echo()` is the recommended alternative to `print()` — it handles encoding correctly, works with pipe redirection, and supports ANSI colors.

```python
import click

# Basic output
click.echo("Hello!")           # Adds newline by default
click.echo("No newline", nl=False)

# Styled output (ANSI codes)
click.echo(click.style("Success!", fg='green', bold=True))
click.echo(click.style("Warning!", fg='yellow'))
click.echo(click.style("Error!", fg='red', bold=True))
click.echo(click.style("Info", fg='blue', underline=True))
click.echo(click.style("Inverted", reverse=True))

# secho = style + echo in one call
click.secho("Done!", fg='green', bold=True)
click.secho("Failed!", fg='red', err=True)  # Write to stderr

# Write to stderr explicitly
import sys
click.echo("Error message", file=sys.stderr)
```

Colors are automatically disabled when output is not a TTY (e.g., when piped to a file), preventing garbled ANSI codes in log files.

---

## Interactive Prompts

```python
@click.command()
@click.argument('directory')
def delete_dir(directory):
    """Delete a directory."""
    # Confirmation prompt — exits if user says no
    click.confirm(f"Delete {directory}? This cannot be undone.", abort=True)
    import shutil
    shutil.rmtree(directory)
    click.secho(f"Deleted {directory}", fg='green')

# Prompt with validation
@click.command()
def setup():
    age = click.prompt("Your age", type=int)
    color = click.prompt("Favorite color", default="blue")
    click.echo(f"Age: {age}, Color: {color}")
```

---

## Command Groups: Building Git-Style CLIs

Real-world CLI tools have multiple subcommands (like `git commit`, `git push`, `docker build`, `docker run`). Click's `@click.group()` enables this:

```python
import click

@click.group()
def cli():
    """A database management tool."""
    pass

@cli.command()
@click.option('--host', default='localhost')
@click.option('--port', default=5432, type=int)
def connect(host, port):
    """Connect to the database."""
    click.echo(f"Connecting to {host}:{port}")

@cli.command()
@click.argument('table')
@click.option('--limit', default=10, type=int)
def query(table, limit):
    """Query a database table."""
    click.echo(f"SELECT * FROM {table} LIMIT {limit}")

@cli.command()
@click.argument('sql_file', type=click.Path(exists=True))
def migrate(sql_file):
    """Run a SQL migration file."""
    click.echo(f"Running migration: {sql_file}")

if __name__ == '__main__':
    cli()
```

```bash
python db_tool.py --help
# Usage: db_tool.py [OPTIONS] COMMAND [ARGS]...
#
#   A database management tool.
#
# Commands:
#   connect  Connect to the database.
#   migrate  Run a SQL migration file.
#   query    Query a database table.

python db_tool.py connect --host db.example.com
python db_tool.py query users --limit 50
python db_tool.py migrate 001_create_tables.sql
```

### Sharing State with Context

When subcommands need to share state (e.g., a database connection, a config file), use Click's context object:

```python
import click

@click.group()
@click.option('--config', default='config.json', type=click.Path())
@click.option('--verbose', is_flag=True)
@click.pass_context                    # Inject the context object
def cli(ctx, config, verbose):
    """My CLI tool."""
    ctx.ensure_object(dict)            # Initialize ctx.obj as a dict
    ctx.obj['config'] = config
    ctx.obj['verbose'] = verbose
    if verbose:
        click.echo(f"Using config: {config}")

@cli.command()
@click.pass_obj                        # Inject ctx.obj directly
def status(obj):
    """Show status."""
    if obj['verbose']:
        click.echo("Verbose mode enabled")
    click.echo(f"Reading config from: {obj['config']}")

@cli.command()
@click.argument('name')
@click.pass_obj
def create(obj, name):
    """Create a resource."""
    click.echo(f"Creating {name} using config {obj['config']}")

if __name__ == '__main__':
    cli()
```

```bash
python tool.py --verbose --config prod.json status
# Verbose mode enabled
# Reading config from: prod.json
```

### Nested Groups

```python
@click.group()
def cli():
    pass

@cli.group()
def user():
    """User management commands."""
    pass

@user.command()
@click.argument('email')
def create(email):
    """Create a new user."""
    click.echo(f"Creating user: {email}")

@user.command()
@click.argument('email')
def delete(email):
    """Delete a user."""
    click.echo(f"Deleting user: {email}")
```

```bash
python tool.py user create alice@example.com
python tool.py user delete bob@example.com
python tool.py user --help
```

---

## Progress Bars

```python
import click
import time

@click.command()
@click.argument('items', nargs=-1)
def process(items):
    """Process items with a progress bar."""
    with click.progressbar(items, label='Processing') as bar:
        for item in bar:
            time.sleep(0.1)  # Simulate work
            # bar updates automatically

# With a known total
@click.command()
def download():
    total_bytes = 1024 * 1024  # 1 MB
    chunk_size = 1024
    with click.progressbar(length=total_bytes, label='Downloading') as bar:
        downloaded = 0
        while downloaded < total_bytes:
            time.sleep(0.001)
            bar.update(chunk_size)
            downloaded += chunk_size
```

---

## Testing with CliRunner

Click's `CliRunner` invokes your commands programmatically without spawning a subprocess, making tests fast and clean.

```python
# test_cli.py
from click.testing import CliRunner
from myapp.cli import cli  # import your top-level group or command

def test_greet_default():
    runner = CliRunner()
    result = runner.invoke(cli, ['greet'])
    assert result.exit_code == 0
    assert 'Hello, World!' in result.output

def test_greet_with_name():
    runner = CliRunner()
    result = runner.invoke(cli, ['greet', '--name', 'Alice'])
    assert result.exit_code == 0
    assert 'Hello, Alice!' in result.output

def test_greet_shout():
    runner = CliRunner()
    result = runner.invoke(cli, ['greet', '--name', 'bob', '--shout'])
    assert result.exit_code == 0
    assert 'HELLO, BOB!' in result.output

def test_missing_required_option():
    runner = CliRunner()
    result = runner.invoke(cli, ['deploy'])  # missing --api-key
    assert result.exit_code != 0
    assert 'Missing option' in result.output

def test_file_input():
    runner = CliRunner()
    with runner.isolated_filesystem():
        # Create a temp file in an isolated directory
        with open('input.txt', 'w') as f:
            f.write("test data\n")
        result = runner.invoke(cli, ['process', 'input.txt'])
        assert result.exit_code == 0
```

---

## Entry Point in pyproject.toml

Define CLI entry points in `pyproject.toml` so pip installs the script as an executable:

```toml
[project.scripts]
# script-name = "module.path:function_name"
myapp = "myapp.cli:cli"
myapp-admin = "myapp.admin:main"
```

After `pip install .` or `pip install -e .`, the `myapp` command is available globally in the virtual environment.

---

## Complete Real-World Example: A Project Scaffolder

```python
# myapp/cli.py
import click
import os
import json
from pathlib import Path

@click.group()
@click.version_option(version='1.0.0')
def cli():
    """Project scaffolding tool."""
    pass

@cli.command()
@click.argument('name')
@click.option('--template', type=click.Choice(['api', 'cli', 'library']),
              default='api', show_default=True, help='Project template type.')
@click.option('--author', prompt='Author name', help='Project author.')
@click.option('--no-git', is_flag=True, help='Skip git initialization.')
def new(name, template, author, no_git):
    """Create a new project named NAME."""
    project_dir = Path(name)

    if project_dir.exists():
        click.secho(f"Error: directory '{name}' already exists.", fg='red', err=True)
        raise click.Abort()

    click.echo(f"Creating {template} project '{name}'...")

    # Create directory structure
    project_dir.mkdir()
    (project_dir / 'src' / name.replace('-', '_')).mkdir(parents=True)
    (project_dir / 'tests').mkdir()

    # Write pyproject.toml
    config = {
        "project": {"name": name, "version": "0.1.0", "authors": [author]}
    }
    (project_dir / 'pyproject.toml').write_text(
        f'[project]\nname = "{name}"\nversion = "0.1.0"\n'
    )
    (project_dir / 'README.md').write_text(f'# {name}\n')

    if not no_git:
        os.system(f"cd {project_dir} && git init -q")
        (project_dir / '.gitignore').write_text('.venv/\n__pycache__/\ndist/\n')
        click.echo("  Initialized git repository.")

    click.secho(f"✓ Created project '{name}'", fg='green', bold=True)
    click.echo(f"\nNext steps:")
    click.echo(f"  cd {name}")
    click.echo(f"  python -m venv .venv && source .venv/bin/activate")
    click.echo(f"  pip install -e '.[dev]'")

@cli.command()
@click.option('--format', 'output_format',
              type=click.Choice(['text', 'json']), default='text')
def list_templates(output_format):
    """List available project templates."""
    templates = [
        {'name': 'api', 'description': 'FastAPI REST API project'},
        {'name': 'cli', 'description': 'Click CLI tool project'},
        {'name': 'library', 'description': 'Reusable Python library'},
    ]
    if output_format == 'json':
        click.echo(json.dumps(templates, indent=2))
    else:
        click.echo("Available templates:")
        for t in templates:
            click.echo(f"  {click.style(t['name'], fg='cyan', bold=True)}: {t['description']}")

if __name__ == '__main__':
    cli()
```

```bash
myapp new my-api --template api
# Author name: Jane Smith
# Creating api project 'my-api'...
#   Initialized git repository.
# ✓ Created project 'my-api'
#
# Next steps:
#   cd my-api
#   python -m venv .venv && source .venv/bin/activate
#   pip install -e '.[dev]'

myapp list-templates --format json
myapp --help
myapp new --help
```

---

## Key Takeaways

- **Click uses decorators** to describe command interfaces declaratively, keeping business logic and argument parsing cleanly separated.
- **`@click.option()`** handles keyword arguments (`--name value`). Set `type=`, `default=`, `required=`, `is_flag=True`, `multiple=True`, and `envvar=` as needed.
- **`@click.argument()`** handles positional arguments. Use `nargs=-1` for variadic inputs.
- **`click.echo()` and `click.secho()`** are safer than `print()` — they handle encoding and support ANSI color output that auto-disables when piped.
- **`@click.group()`** creates multi-command CLIs like `git` or `docker`. Subcommands are registered with `@group.command()`. Groups can be nested.
- **`@click.pass_context` and `@click.pass_obj`** share state (connections, config, flags) between a group and its subcommands without globals.
- **`CliRunner`** enables unit testing your CLI — invoke commands in-process with controlled input, capture output, and assert on exit codes.
- **Define entry points in `pyproject.toml`** under `[project.scripts]` to install your command as an executable when the package is installed.
- Click automatically generates `--help` output from function docstrings and option `help=` parameters. Write good docstrings and help text — it's your user documentation.
