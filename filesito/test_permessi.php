<?php
// Funzione per verificare i permessi di scrittura
function check_permissions($dir) {
    echo "Verifica permessi per la cartella: $dir<br>";
    if (is_writable($dir)) {
        echo "<strong style='color:green;'>La cartella è scrivibile.</strong><br>";
        $test_file = $dir . '/test_write.tmp';
        if (file_put_contents($test_file, 'test')) {
            echo "<strong style='color:green;'>Test di scrittura superato.</strong> Il file temporaneo è stato creato e verrà eliminato.<br>";
            unlink($test_file); // Pulisce il file di test
        } else {
            echo "<strong style='color:red;'>Errore: Impossibile scrivere un file nella cartella, anche se sembra scrivibile.</strong> Controlla i permessi del file system in modo più approfondito.<br>";
        }
    } else {
        echo "<strong style='color:red;'>La cartella non è scrivibile.</strong> L'applicazione non potrà caricare file.<br>";
        echo "Prova a eseguire il seguente comando nel terminale (per sistemi Linux/macOS): <pre>chmod -R 775 " . realpath($dir) . "</pre><br>";
        echo "O assicurati che l'utente del server web (es. 'www-data', 'apache') abbia i permessi di scrittura.<br>";
    }
}

// Funzione per verificare l'esistenza e i permessi di lettura dei file JSON
function check_json_files($dir) {
    echo "<hr>Verifica file JSON nella cartella: $dir<br>";
    if (!is_dir($dir)) {
        echo "<strong style='color:orange;'>La cartella non esiste. Verrà creata al primo salvataggio.</strong><br>";
        return;
    }
    $files = glob($dir . '/*.json');
    if (empty($files)) {
        echo "<strong style='color:orange;'>Nessun file .json trovato.</strong> I dati dei personaggi appariranno qui una volta creati.<br>";
    } else {
        echo "Trovati " . count($files) . " file .json.<br>";
        $unreadable_files = 0;
        foreach ($files as $file) {
            if (!is_readable($file)) {
                echo "<strong style='color:red;'>Errore: Il file $file non è leggibile.</strong><br>";
                $unreadable_files++;
            }
        }
        if ($unreadable_files === 0) {
            echo "<strong style='color:green;'>Tutti i file .json sono leggibili.</strong><br>";
        }
    }
}

// Esecuzione dei test

ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h1>Test Permessi Applicazione</h1>";
echo "Utente attuale dello script PHP: <strong>" . get_current_user() . "</strong><br>";

// Test per la cartella uploads
$upload_dir = __DIR__ . '/uploads';
check_permissions($upload_dir);

// Test per la cartella dati principale
$data_dir = __DIR__ . '/data';
check_permissions($data_dir);

// Test per la cartella degli utenti (se esiste)
$users_data_dir = __DIR__ . '/data/users';
if (is_dir($users_data_dir)) {
    $user_folders = glob($users_data_dir . '/*', GLOB_ONLYDIR);
    echo "<hr>Verifica sottocartelle utenti in: $users_data_dir<br>";
    if (empty($user_folders)) {
        echo "<strong style='color:orange;'>Nessuna cartella utente trovata.</strong> Verranno create al primo accesso/salvataggio di un utente.<br>";
    } else {
        foreach ($user_folders as $user_folder) {
            echo "<h4>Cartella Utente: " . basename($user_folder) . "</h4>";
            check_permissions($user_folder);
            check_json_files($user_folder);
        }
    }
}

// Test per il file users.json
$users_file = __DIR__ . '/php/users.json';
echo "<hr>Verifica file utenti: $users_file<br>";
if (file_exists($users_file)) {
    if (is_readable($users_file)) {
        echo "<strong style='color:green;'>Il file users.json è leggibile.</strong><br>";
    } else {
        echo "<strong style='color:red;'>Errore: Il file users.json non è leggibile.</strong><br>";
    }
    if (is_writable($users_file)) {
        echo "<strong style='color:green;'>Il file users.json è scrivibile.</strong><br>";
    } else {
        echo "<strong style='color:red;'>Errore: Il file users.json non è scrivibile.</strong> La gestione utenti (creazione/modifica) non funzionerà.<br>";
    }
} else {
    echo "<strong style='color:orange;'>Il file users.json non esiste.</strong> Verrà creato alla prima registrazione di un utente.<br>";
}

echo "<hr><p><strong>Test completati.</strong></p>";

?>