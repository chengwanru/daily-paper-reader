from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NOTICE_FILES = (
    ROOT / "docs_init" / "_home_notice.md",
    ROOT / "docs" / "_home_notice.md",
)
PROMO_FILES = (
    ROOT / "docs_init" / "_home_promo.md",
    ROOT / "docs" / "_home_promo.md",
)
HOME_README_FILES = (
    ROOT / "docs_init" / "README.md",
    ROOT / "docs" / "README.md",
)


def test_home_notice_and_promo_modules_are_empty():
    for path in NOTICE_FILES + PROMO_FILES:
        content = path.read_text(encoding="utf-8").strip()
        assert content == "", path


def test_homepage_omits_notice_and_promo_cards():
    for path in HOME_README_FILES:
        content = path.read_text(encoding="utf-8")
        assert "dpr-home-notice-card" not in content, path
        assert "dpr-home-promo-card" not in content, path
        assert "公告与更新" not in content, path
        assert "社区与支持" not in content, path
        assert "QQ群" not in content, path
        assert "反馈功能上线" not in content, path
        assert content.count('class="dpr-home-dashboard-card ') == 4, path


def test_site_stats_script_is_loaded_without_blocking_core_assets():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert "app/site-stats.js" in html
    assert "[DPR] 首页统计加载失败" in html
    assert "app/feedback.issue.js" not in html


def test_supabase_site_reader_stats_sql_is_least_privilege():
    sql = (ROOT / "sql" / "create_site_reader_stats_schema.sql").read_text(encoding="utf-8").lower()

    assert "create table if not exists public.site_daily_reader_events" in sql
    assert "create table if not exists public.site_daily_reader_counts" in sql
    assert "alter table public.site_daily_reader_events enable row level security" in sql
    assert "alter table public.site_daily_reader_counts enable row level security" in sql
    assert "create schema if not exists private" in sql
    assert "create or replace function private.increment_site_daily_reader_count" in sql
    assert "security definer" in sql
    assert "set search_path = ''" in sql
    assert "grant insert on public.site_daily_reader_events to anon, authenticated" in sql
    assert "grant select on public.site_daily_reader_counts to anon, authenticated" in sql
    assert "for insert" in sql and "with check" in sql
    assert "asia/shanghai" in sql
    assert "visitor_hash ~ '^[a-f0-9]{64}$'" in sql
    assert "grant select on public.site_daily_reader_events to anon" not in sql
