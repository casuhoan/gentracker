<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "INIZIO MIGRAZIONE UTENTI...\n\n";

// --- PATHS ---
$users_file = __DIR__ . '/data/users.json';
$users_dir = __DIR__ . '/data/users/';
$uploads_dir = __DIR__ . '/uploads/';

// --- VERIFICA FILE UTENTI ---
if (!file_exists($users_file)) {
    die("ERRORE: Il file 'data/users.json' non è stato trovato.\n");
}

$users_content = file_get_contents($users_file);
$users = json_decode($users_content, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    die("ERRORE: Il file 'data/users.json' è corrotto o malformattato.\n");
}

$migration_needed = false;
$updated_users = [];

// --- CICLO DI MIGRAZIONE ---
foreach ($users as $user) {
    // Se l'utente ha già un ID, è già migrato. Lo saltiamo.
    if (isset($user['id']) && !empty($user['id'])) {
        echo "Utente '{$user['username']}' (ID: {$user['id']}) è già migrato. Saltato.\n";
        $updated_users[] = $user;
        continue;
    }

    $migration_needed = true;
    $username = $user['username'];
    // Genera un ID unico e più leggibile
    $new_id = 'user_' . str_replace('.', '', uniqid('', true));

    echo "--------------------------------------------------\n";
    echo "Migrazione per l'utente: '{$username}'\n";
    echo "Nuovo ID Unico: {$new_id}\n";

    // 1. Rinomina la cartella dati dell'utente
    $old_user_data_dir = $users_dir . $username;
    $new_user_data_dir = $users_dir . $new_id;

    if (is_dir($old_user_data_dir)) {
        if (rename($old_user_data_dir, $new_user_data_dir)) {
            echo "OK: Cartella dati rinominata da '{$old_user_data_dir}' a '{$new_user_data_dir}'\n";

            // 2. Migra i file dei personaggi e le loro immagini
            $character_files = glob($new_user_data_dir . '/*.json');
            foreach ($character_files as $char_file) {
                $char_data = json_decode(file_get_contents($char_file), true);
                if (isset($char_data['profile']['splashart']) && !empty($char_data['profile']['splashart'])) {
                    $old_splashart_path = __DIR__ . '/' . $char_data['profile']['splashart'];
                    $splashart_filename = basename($old_splashart_path);

                    // Controlla se il file usa il vecchio formato NOMEUTENTE_...
                    if (strpos($splashart_filename, $username . '_') === 0) {
                        $new_splashart_filename = str_replace($username . '_', $new_id . '_', $splashart_filename);
                        $new_splashart_path_relative = 'uploads/' . $new_splashart_filename;
                        $new_splashart_path_absolute = $uploads_dir . $new_splashart_filename;

                        if (file_exists($old_splashart_path)) {
                            if (rename($old_splashart_path, $new_splashart_path_absolute)) {
                                echo "  - Immagine personaggio rinominata: '{$splashart_filename}' -> '{$new_splashart_filename}'\n";
                                $char_data['profile']['splashart'] = $new_splashart_path_relative;
                                file_put_contents($char_file, json_encode($char_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                            } else {
                                echo "  - ERRORE: Impossibile rinominare '{$splashart_filename}'.\n";
                            }
                        }
                    }
                }
            }
        } else {
            echo "ERRORE: Impossibile rinominare la cartella dati per '{$username}'. Controllare i permessi.\n";
        }
    } else {
        echo "AVVISO: Nessuna cartella dati trovata per '{$username}'.\n";
    }

    // 3. Rinomina l'avatar dell'utente
    if (isset($user['avatar']) && !empty($user['avatar'])) {
        $old_avatar_path = __DIR__ . '/' . $user['avatar'];
        $avatar_filename = basename($old_avatar_path);

        if (strpos($avatar_filename, $username . '_avatar') === 0) {
            $new_avatar_filename = str_replace($username . '_avatar', $new_id . '_avatar', $avatar_filename);
            $new_avatar_path_relative = 'uploads/' . $new_avatar_filename;
            $new_avatar_path_absolute = $uploads_dir . $new_avatar_filename;

            if (file_exists($old_avatar_path)) {
                if (rename($old_avatar_path, $new_avatar_path_absolute)) {
                    echo "OK: Avatar rinominato: '{$avatar_filename}' -> '{$new_avatar_filename}'\n";
                    $user['avatar'] = $new_avatar_path_relative;
                } else {
                    echo "ERRORE: Impossibile rinominare l'avatar '{$avatar_filename}'.\n";
                }
            }
        }
    }

    // 4. Assegna il nuovo ID all'utente
    $user['id'] = $new_id;
    $updated_users[] = $user;
}

// --- SALVATAGGIO FINALE ---
if ($migration_needed) {
    if (file_put_contents($users_file, json_encode($updated_users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo "\n--------------------------------------------------\n";
        echo "MIGRAZIONE COMPLETATA.\n";
        echo "Il file 'data/users.json' è stato aggiornato con i nuovi ID.\n";
    } else {
        echo "\nERRORE CRITICO: Impossibile salvare il file 'data/users.json' aggiornato.\n";
    }
} else {
    echo "\nNessuna migrazione necessaria. Tutti gli utenti hanno già un ID.\n";
}

echo "\nFINE MIGRAZIONE.\n";
?>