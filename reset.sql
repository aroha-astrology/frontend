DELETE FROM daily_horoscopes WHERE status IN ('generating', 'failed');
DELETE FROM tomorrow_horoscopes WHERE status IN ('generating', 'failed');
DELETE FROM weekly_horoscopes WHERE status IN ('generating', 'failed');
DELETE FROM monthly_horoscopes WHERE status IN ('generating', 'failed');
DELETE FROM yearly_horoscopes WHERE status IN ('generating', 'failed');
