-- Sample historical notes for demonstration
-- Run this in your Supabase SQL editor

INSERT INTO ticker_notes (symbol, note_text, note_type, created_at, updated_at) VALUES
('AAPL', 'TEST**Strong quarterly earnings beat expectations. iPhone sales up 12% YoY. Bullish on Q4 guidance.', 'earnings', '2023-08-10 14:30:00+00', '2023-08-10 14:30:00+00'),
('AAPL', 'TEST**Technical breakout above $180 resistance. Volume spike suggests institutional buying.', 'technical', '2023-07-15 09:45:00+00', '2023-07-15 09:45:00+00'),
('TSLA', 'TEST**Cybertruck production ramping up. Management confident in Q4 delivery targets.', 'news', '2023-06-20 11:20:00+00', '2023-06-20 11:20:00+00'),
('TSLA', 'TEST**P/E still elevated at 65x. Waiting for better entry point around $200 support level.', 'analysis', '2023-05-08 16:15:00+00', '2023-05-08 16:15:00+00'),
('SPY', 'TEST**Fed hawkish tone at Jackson Hole. Expecting continued rate pressure through year-end.', 'fundamental', '2023-08-25 13:00:00+00', '2023-08-25 13:00:00+00'),
('GOOG', 'TEST**AI advancements in Bard looking promising. Could be catalyst for multiple expansion.', 'research', '2023-07-03 10:30:00+00', '2023-07-03 10:30:00+00'),
('DIS', 'TEST**Streaming subscriber growth slowing. Concerned about competitive pressure from Netflix.', 'analysis', '2023-09-15 10:00:00+00', '2023-09-15 10:00:00+00'),
('UNH', 'TEST**Healthcare sector rotation starting. UNH showing relative strength vs peers.', 'technical', '2023-10-01 14:45:00+00', '2023-10-01 14:45:00+00')
ON CONFLICT DO NOTHING;