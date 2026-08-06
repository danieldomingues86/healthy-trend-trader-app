-- V4 proposal: PostgreSQL model for the independent Trader Journal module

CREATE TABLE journal_entry (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    trading_account_id UUID,
    journal_date DATE NOT NULL,
    title VARCHAR(180) NOT NULL,
    market_permission VARCHAR(20) NOT NULL CHECK (market_permission IN ('DOWN','TRANSITION','UP')),
    market_deserves_capital BOOLEAN,
    notes TEXT,
    execution_score NUMERIC(3,1),
    error_to_avoid TEXT,
    phrase_of_day TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, trading_account_id, journal_date)
);

CREATE TABLE journal_entry_emotion (
    journal_entry_id UUID NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
    emotion VARCHAR(30) NOT NULL,
    PRIMARY KEY (journal_entry_id, emotion)
);

CREATE TABLE journal_entry_check_item (
    id UUID PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
    code VARCHAR(60) NOT NULL,
    label VARCHAR(180) NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE journal_attachment (
    id UUID PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type VARCHAR(100),
    caption TEXT,
    category VARCHAR(30), -- INDEX, OPEN_POSITION, NEW_ENTRY, OTHER
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE journal_position_link (
    journal_entry_id UUID NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
    position_id UUID NOT NULL,
    PRIMARY KEY (journal_entry_id, position_id)
);
