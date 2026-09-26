-- Default to the Israel holiday calendar (1-day Yom Tov).
-- The previous default (false = Diaspora) made users in Israel skip study on
-- second-day Yom Tov (e.g. Sukkot II, which is Chol HaMoed in Israel).
-- There is no UI for changing israel_mode yet, so every existing false value is
-- just the old default: flip them all and clear the cached Yom Tov dates so
-- clients recompute them with the Israel calendar.

ALTER TABLE user_preferences
ALTER COLUMN israel_mode SET DEFAULT true;

UPDATE user_preferences
SET israel_mode = true,
    yom_tov_dates = '{}',
    yom_tov_dates_until = NULL
WHERE israel_mode = false;
