-- "Meine Insel": Münzen (eigene Währung, unabhängig von points/Level) +
-- gekaufte Insel-Gegenstände. points/Level bleiben unverändert die reine
-- Fortschrittsmessung – coins sind ausschließlich zum Freischalten/Bauen da,
-- damit sich das Belohnungssystem nicht mit der Lernstand-Messung vermischt.
alter table student_state add column if not exists coins int not null default 0;
alter table student_state add column if not exists island_items jsonb not null default '[]'::jsonb;
