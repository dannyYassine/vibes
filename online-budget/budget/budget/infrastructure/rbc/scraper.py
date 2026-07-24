import os
from datetime import date
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

from budget.budget.application.ports import RBCScraper
from budget.budget.domain.exceptions import RBCLoginError, SyncFailed

from . import selectors as S
from .csv_parser import parse_csv


class PlaywrightRBCScraper(RBCScraper):
    DOWNLOAD_DIR = Path(os.environ.get("RBC_DOWNLOAD_DIR", "/tmp/rbc_exports"))

    def __init__(self, headless: bool = True):
        self._headless = headless
        self.DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    def scrape(self, since: date) -> list[dict]:
        username = os.environ.get("RBC_USERNAME")
        password = os.environ.get("RBC_PASSWORD")
        if not username or not password:
            raise SyncFailed("RBC_USERNAME / RBC_PASSWORD not set in env")
        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=self._headless)
                ctx = browser.new_context(accept_downloads=True)
                page = ctx.new_page()

                page.goto("https://www1.rbc.com/onlinebanking/")
                page.fill(S.USERNAME_INPUT, username)
                page.fill(S.PASSWORD_INPUT, password)
                page.click(S.SIGN_IN_BUTTON)

                try:
                    page.wait_for_selector(S.MFA_PROMPT, timeout=4000)
                    raise RBCLoginError("MFA challenge — complete first login manually, then retry")
                except PlaywrightTimeout:
                    pass

                page.wait_for_selector(S.ACCOUNTS_TABLE, timeout=15000)
                page.click(S.JOINT_CHEQUING_LINK)
                page.wait_for_selector(S.EXPORT_BUTTON, timeout=15000)
                page.click(S.EXPORT_BUTTON)

                page.check(S.FORMAT_CSV_RADIO)
                page.fill(S.DATE_FROM_INPUT, since.isoformat())
                page.fill(S.DATE_TO_INPUT, date.today().isoformat())

                with page.expect_download(timeout=30000) as dl_info:
                    page.click(S.DOWNLOAD_BUTTON)
                download = dl_info.value
                save_path = self.DOWNLOAD_DIR / download.suggested_filename
                download.save_as(str(save_path))

                browser.close()
                return parse_csv(save_path)
        except (RBCLoginError, SyncFailed):
            raise
        except Exception as exc:
            raise SyncFailed(f"Scraper error: {exc}") from exc