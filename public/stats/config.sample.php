<?php
// Vorlage. Die echte config.php (mit Passwort-Hash) liegt nicht im öffentlichen Repo.
// Hash erzeugen: php -r "echo password_hash('meinPasswort', PASSWORD_DEFAULT);"
const APP_PASSWORD_HASH = 'ÄNDERE_MICH';
const DB_PATH = __DIR__ . '/data/stats.sqlite';
const BACKUP_DIR = __DIR__ . '/data/backups';
