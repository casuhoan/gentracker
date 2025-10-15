<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Custom error handler to ensure JSON responses even on PHP errors
set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return;
    }
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Internal Server Error',
        'error_details' => [
            'type' => 'Handler Caught',
            'severity' => $severity,
            'message' => $message,
            'file' => $file,
            'line' => $line
        ]
    ]);
    exit;
});

// Custom shutdown function to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
        http_response_code(500);
        if (ob_get_length()) {
            ob_end_clean();
        }
        echo json_encode([
            'status' => 'error',
            'message' => 'Fatal Server Error',
            'error_details' => [
                'type' => 'Shutdown Caught',
                'message' => $error['message'],
                'file' => $error['file'],
                'line' => $error['line']
            ]
        ]);
    }
});

session_start();

header('Content-Type: application/json');

// --- HELPERS ---
function is_logged_in() {
    return isset($_SESSION['user_id']); // Usa user_id come riferimento
}

function is_admin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function get_user_data_dir() {
    if (!is_logged_in()) return null;
    // La cartella dati ora è basata sull'ID, non sul nome utente
    return __DIR__ . '/../data/users/' . $_SESSION['user_id'] . '/';
}

function get_users_file() {
    return __DIR__ . '/../data/users.json';
}

function get_backgrounds_dir() {
    return __DIR__ . '/../data/backgrounds/';
}

function get_user_schema_file() {
    return __DIR__ . '/../data/user_schema.json';
}

function get_elements_file() {
    return __DIR__ . '/../data/elements.json';
}

function get_element_icons_dir() {
    $dir = __DIR__ . '/../data/icons/elements/';
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    return $dir;
}

// --- ELEMENT FUNCTIONS ---
function init_elements_file() {
    $elements_file = get_elements_file();
    if (!file_exists($elements_file)) {
        $default_elements = [
            ["name" => "Anemo", "icon" => ""],
            ["name" => "Geo", "icon" => ""],
            ["name" => "Electro", "icon" => ""],
            ["name" => "Dendro", "icon" => ""],
            ["name" => "Hydro", "icon" => ""],
            ["name" => "Pyro", "icon" => ""],
            ["name" => "Cryo", "icon" => ""],
        ];
        file_put_contents($elements_file, json_encode($default_elements, JSON_PRETTY_PRINT));
    }
}

function get_elements() {
    init_elements_file(); // Ensure it exists
    get_element_icons_dir(); // Ensure the directory exists
    header('Content-Type: application/json');
    echo file_get_contents(get_elements_file());
}

function add_element() {
    $elements_file = get_elements_file();
    $elements = json_decode(file_get_contents($elements_file), true);

    $element_name = $_POST['element_name'] ?? '';
    if (empty($element_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Il nome dell\'elemento è obbligatorio.']);
        return;
    }

    foreach ($elements as $el) {
        if (strcasecmp($el['name'], $element_name) == 0) {
            echo json_encode(['status' => 'error', 'message' => 'Un elemento con questo nome esiste già.']);
            return;
        }
    }

    $icon_path = '';
    if (isset($_FILES['element_icon']) && $_FILES['element_icon']['error'] == 0) {
        $icons_dir = get_element_icons_dir();
        $file_ext = pathinfo($_FILES['element_icon']['name'], PATHINFO_EXTENSION);
        $safe_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($element_name));
        $file_name = $safe_name . '.' . $file_ext;
        $target_file = $icons_dir . $file_name;

        if (move_uploaded_file($_FILES['element_icon']['tmp_name'], $target_file)) {
            $icon_path = $file_name;
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Errore durante il caricamento dell\'icona.']);
            return;
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'L\'icona è obbligatoria.']);
        return;
    }

    $elements[] = ['name' => $element_name, 'icon' => $icon_path];
    file_put_contents($elements_file, json_encode($elements, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success']);
}

function update_element_icon() {
    $elements_file = get_elements_file();
    $elements = json_decode(file_get_contents($elements_file), true);
    
    $element_name = $_POST['element_name'] ?? '';
    if (empty($element_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Nome elemento non specificato.']);
        return;
    }

    $icon_path = '';
    if (isset($_FILES['element_icon']) && $_FILES['element_icon']['error'] == 0) {
        $icons_dir = get_element_icons_dir();
        $file_ext = pathinfo($_FILES['element_icon']['name'], PATHINFO_EXTENSION);
        $safe_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($element_name));
        $file_name = $safe_name . '.' . $file_ext;
        $target_file = $icons_dir . $file_name;

        // Rimuovi vecchia icona se esiste e ha un nome diverso
        foreach ($elements as $el) {
            if ($el['name'] === $element_name && !empty($el['icon']) && $el['icon'] !== $file_name) {
                $old_icon_path = $icons_dir . $el['icon'];
                if (file_exists($old_icon_path)) {
                    unlink($old_icon_path);
                }
                break;
            }
        }

        if (move_uploaded_file($_FILES['element_icon']['tmp_name'], $target_file)) {
            $icon_path = $file_name;
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Errore durante il caricamento della nuova icona.']);
            return;
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Nessuna icona caricata.']);
        return;
    }

    foreach ($elements as &$el) {
        if ($el['name'] === $element_name) {
            $el['icon'] = $icon_path;
            break;
        }
    }

    file_put_contents($elements_file, json_encode($elements, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success']);
}

// --- AUTHENTICATION FUNCTIONS ---
function login() {
    $users_file = get_users_file();
    if (!file_exists($users_file)) {
        echo json_encode(['status' => 'error', 'message' => 'Nessun utente configurato.']);
        return;
    }

    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    $users = json_decode(file_get_contents($users_file), true);

    if (!is_array($users)) {
        echo json_encode(['status' => 'error', 'message' => 'Credenziali non valide.']);
        return;
    }

    foreach ($users as $user) {
        if (!is_array($user) || !isset($user['username']) || !isset($user['passwordHash'])) {
            continue;
        }

        if ($user['username'] === $username && password_verify($password, $user['passwordHash'])) {
            // Controlla che l'utente abbia un ID valido prima del login
            if (!isset($user['id']) || empty($user['id'])) {
                error_log("Login fallito per l'utente '{$username}': ID utente mancante o vuoto in users.json.");
                echo json_encode(['status' => 'error', 'message' => 'Errore di configurazione dell\'account (ID mancante). Contattare un amministratore.']);
                return;
            }

            // Imposta tutte le variabili di sessione necessarie
            $_SESSION['user_id'] = $user['id']; // <-- MODIFICA CHIAVE
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            echo json_encode(['status' => 'success', 'message' => 'Login effettuato con successo.']);
            return;
        }
    }

    echo json_encode(['status' => 'error', 'message' => 'Credenziali non valide.']);
}

function logout() {
    session_destroy();
    echo json_encode(['status' => 'success', 'message' => 'Logout effettuato.']);
}

function check_session() {
    if (!is_logged_in()) {
        echo json_encode(['status' => 'error', 'message' => 'Nessuna sessione attiva.']);
        return;
    }

    $users_file = get_users_file();
    $users = json_decode(file_get_contents($users_file), true);
    $found_user = null;
    foreach ($users as $user) {
        // Cerca per ID, non per username
        if ($user['id'] === $_SESSION['user_id']) {
            $found_user = $user;
            break;
        }
    }

    if ($found_user) {
        // Rinfresca il nome utente nella sessione se è cambiato
        $_SESSION['username'] = $found_user['username'];

        echo json_encode([
            'status' => 'success',
            'username' => $found_user['username'],
            'role' => $found_user['role'],
            'avatar' => $found_user['avatar'] ?? '',
            'background' => $found_user['background'] ?? 'disattivato',
            'card_opacity' => $found_user['card_opacity'] ?? 'off'
        ]);
    } else {
        // Se l'ID utente in sessione non esiste più, distruggi la sessione
        logout();
    }
}

// --- NEW BACKGROUND FUNCTIONS ---
function get_backgrounds() {
    $bg_dir = get_backgrounds_dir();
    if (!is_dir($bg_dir)) {
        mkdir($bg_dir, 0777, true);
    }
    $files = glob($bg_dir . '*.{jpg,jpeg,png,gif,webp}', GLOB_BRACE);
    $backgrounds = [];
    foreach ($files as $file) {
        $backgrounds[] = basename($file);
    }
    echo json_encode(['status' => 'success', 'backgrounds' => $backgrounds]);
}

function upload_background() {
    if (!isset($_FILES['background_image']) || $_FILES['background_image']['error'] != 0) {
        echo json_encode(['status' => 'error', 'message' => 'Nessun file caricato o errore nel caricamento.']);
        return;
    }

    $bg_dir = get_backgrounds_dir();
    if (!is_dir($bg_dir)) {
        mkdir($bg_dir, 0777, true);
    }

    $file_name = basename($_FILES['background_image']['name']);
    $target_file = $bg_dir . $file_name;

    if (move_uploaded_file($_FILES['background_image']['tmp_name'], $target_file)) {
        echo json_encode(['status' => 'success', 'message' => 'Sfondo caricato con successo.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Errore durante il salvataggio dello sfondo.']);
    }
}

function delete_background() {
    $data = json_decode(file_get_contents('php://input'), true);
    $filename = $data['filename'] ?? '';

    if (empty($filename)) {
        echo json_encode(['status' => 'error', 'message' => 'Nome file non fornito.']);
        return;
    }

    $file_path = get_backgrounds_dir() . $filename;

    if (file_exists($file_path)) {
        if (unlink($file_path)) {
            echo json_encode(['status' => 'success', 'message' => 'Sfondo eliminato con successo.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Impossibile eliminare lo sfondo.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Sfondo non trovato.']);
    }
}

// --- NEW USER SCHEMA FUNCTIONS ---
function get_user_schema() {
    $schema_file = get_user_schema_file();
    if (!file_exists($schema_file)) {
        $default_schema = [
            ['name' => 'username', 'default' => '', 'editable' => false],
            ['name' => 'passwordHash', 'default' => '', 'editable' => false],
            ['name' => 'role', 'default' => 'user', 'editable' => true],
            ['name' => 'avatar', 'default' => '', 'editable' => true],
            ['name' => 'background', 'default' => 'disattivato', 'editable' => true],
            ['name' => 'card_opacity', 'default' => 'off', 'editable' => true]
        ];
        file_put_contents($schema_file, json_encode($default_schema, JSON_PRETTY_PRINT));
        echo json_encode($default_schema);
    } else {
        echo file_get_contents($schema_file);
    }
}

function save_user_schema() {
    $data = json_decode(file_get_contents('php://input'), true);
    $schema = $data['schema'] ?? null;

    if ($schema === null) {
        echo json_encode(['status' => 'error', 'message' => 'Nessun dato dello schema ricevuto.']);
        return;
    }

    if (file_put_contents(get_user_schema_file(), json_encode($schema, JSON_PRETTY_PRINT))) {
        echo json_encode(['status' => 'success', 'message' => 'Schema utente salvato con successo.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare lo schema utente.']);
    }
}

function enforce_user_schema() {
    $schema_file = get_user_schema_file();
    $users_file = get_users_file();

    if (!file_exists($schema_file)) {
        get_user_schema(); // This will create the default schema if it's missing
    }

    $schema = json_decode(file_get_contents($schema_file), true);
    $users = json_decode(file_get_contents($users_file), true);
    $changes_made = false;

    if (!is_array($users)) $users = [];
    if (!is_array($schema)) $schema = [];

    foreach ($users as &$user) {
        foreach ($schema as $field) {
            if (!isset($user[$field['name']])) {
                $user[$field['name']] = $field['default'];
                $changes_made = true;
            }
        }
    }

    if ($changes_made) {
        if (file_put_contents($users_file, json_encode($users, JSON_PRETTY_PRINT))) {
            echo json_encode(['status' => 'success', 'message' => 'Sincronizzazione utenti completata.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Errore durante il salvataggio del file utenti.']);
        }
    } else {
        echo json_encode(['status' => 'success', 'message' => 'Nessuna modifica necessaria, gli utenti sono già sincronizzati.']);
    }
}

// --- CHARACTER DATA FUNCTIONS ---
function get_all_characters() {
    $data_dir = get_user_data_dir();
    $characters = [];
    if (!is_dir($data_dir)) {
        echo json_encode([]);
        return;
    }

    $files = glob($data_dir . '*.json');
    foreach ($files as $file) {
        $content = json_decode(file_get_contents($file), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            continue; // Skip corrupted file
        }
        if (isset($content['profile'])) {
            if (!isset($content['profile']['rarity'])) {
                $content['profile']['rarity'] = '5-star';
            }
            $content['profile']['latest_build_stats'] = [];
            if (!empty($content['builds'])) {
                usort($content['builds'], function($a, $b) {
                    return strtotime($b['date']) - strtotime($a['date']);
                });
                $content['profile']['latest_build_stats'] = $content['builds'][0]['stats'];
                $content['profile']['latest_constellation'] = $content['builds'][0]['constellation'];
            } else {
                $content['profile']['latest_constellation'] = $content['profile']['constellation'] ?? 0;
            }
            $characters[] = $content;
        }
    }

    echo json_encode($characters);
}

function save_character() {
    $user_data_dir = get_user_data_dir();
    if (!is_dir($user_data_dir)) mkdir($user_data_dir, 0777, true);

    $splashart_path = '';
    $default_image_path = $_POST['default_image_path'] ?? '';
    $char_name = $_POST['name'] ?? '';

    // Gestione Immagine - Usa l'ID utente per il nome del file
    if (!empty($default_image_path)) {
        $source_file = __DIR__ . '/../' . $default_image_path;
        if (file_exists($source_file)) {
            $upload_dir = __DIR__ . '/../uploads/';
            $file_extension = pathinfo($source_file, PATHINFO_EXTENSION);
            $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($char_name));
            // Nuovo formato nome file: USERID_CHARNAME.ext
            $file_name = $_SESSION['user_id'] . '_' . $safe_char_name . '.' . $file_extension;
            $target_file = $upload_dir . $file_name;
            if (copy($source_file, $target_file)) {
                $splashart_path = 'uploads/' . $file_name;
            }
        }
    } elseif (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        $upload_dir = __DIR__ . '/../uploads/';
        $file_extension = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($char_name));
        // Nuovo formato nome file: USERID_CHARNAME.ext
        $file_name = $_SESSION['user_id'] . '_' . $safe_char_name . '.' . $file_extension;
        $target_file = $upload_dir . $file_name;
        if (move_uploaded_file($_FILES['splashart']['tmp_name'], $target_file)) {
            $splashart_path = 'uploads/' . $file_name;
        }
    }

    $ideal_stats = [];
    if(isset($_POST['ideal_stats']) && is_array($_POST['ideal_stats'])){
        foreach($_POST['ideal_stats'] as $stat => $value){
            if(!empty($value)){
                $ideal_stats[$stat] = floatval($value);
            }
        }
    }

    $data = [
        'profile' => [
            'name' => $char_name,
            'splashart' => $splashart_path,
            'element' => $_POST['element'] ?? '',
            'role' => $_POST['role'] ?? [],
            'tracked_stats' => $_POST['tracked_stats'] ?? [],
            'ideal_stats' => $ideal_stats,
            'acquisition_date' => $_POST['acquisition_date'] ?? '',
            'constellation' => isset($_POST['constellation']) ? intval($_POST['constellation']) : 0,
            'signature_weapon' => $_POST['signature_weapon'] ?? '',
            'talents' => $_POST['talents'] ?? '',
            'rarity' => $_POST['rarity'] ?? '5-star'
        ],
        'builds' => []
    ];

    $json_file_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($char_name)) . '.json';
    $json_file_path = $user_data_dir . $json_file_name;

    if (file_put_contents($json_file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Personaggio salvato con successo']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file JSON.']);
    }
}

function update_character() {
    $original_name = $_POST['original_name'] ?? '';
    $new_name = $_POST['name'] ?? '';
    if (empty($original_name) || empty($new_name)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Nome del personaggio mancante.']);
        return;
    }

    $user_data_dir = get_user_data_dir();
    $original_file_path = $user_data_dir . preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($original_name)) . '.json';
    if (!file_exists($original_file_path)) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Personaggio originale non trovato.']);
        return;
    }

    $data = json_decode(file_get_contents($original_file_path), true);

    // Gestione Immagine - Usa l'ID utente per il nome del file
    $default_image_path = $_POST['default_image_path'] ?? '';
    if (!empty($default_image_path)) {
        if(!empty($data['profile']['splashart']) && file_exists(__DIR__.'/../'.$data['profile']['splashart'])) {
            unlink(__DIR__.'/../'.$data['profile']['splashart']);
        }

        $source_file = __DIR__ . '/../' . $default_image_path;
        if (file_exists($source_file)) {
            $upload_dir = __DIR__ . '/../uploads/';
            $file_extension = pathinfo($source_file, PATHINFO_EXTENSION);
            $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($new_name));
            $file_name = $_SESSION['user_id'] . '_' . $safe_char_name . '.' . $file_extension;
            $target_file = $upload_dir . $file_name;
            if (copy($source_file, $target_file)) {
                $data['profile']['splashart'] = 'uploads/' . $file_name;
            }
        }
    } elseif (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        if(!empty($data['profile']['splashart']) && file_exists(__DIR__.'/../'.$data['profile']['splashart'])) {
            unlink(__DIR__.'/../'.$data['profile']['splashart']);
        }
        $upload_dir = __DIR__ . '/../uploads/';
        $file_ext = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $file_name = $_SESSION['user_id'].'_'.preg_replace('/[^a-zA-Z0-9_-]/','_',strtolower($new_name)).'.'.$file_ext;
        $target_file = $upload_dir . $file_name;
        if(move_uploaded_file($_FILES['splashart']['tmp_name'], $target_file)) {
            $data['profile']['splashart'] = 'uploads/'.$file_name;
        }
    }

    $data['profile']['name'] = $new_name;
    $fields = ['element','role','tracked_stats','acquisition_date','signature_weapon','talents','rarity'];
    foreach($fields as $f) {
        if(isset($_POST[$f])) $data['profile'][$f] = $_POST[$f];
    }
    if(isset($_POST['constellation'])) $data['profile']['constellation'] = intval($_POST['constellation']);
    if(isset($_POST['ideal_stats']) && is_array($_POST['ideal_stats'])) {
        $ideal_stats = [];
        foreach($_POST['ideal_stats'] as $stat => $val) if($val !== '') $ideal_stats[$stat] = floatval($val);
        $data['profile']['ideal_stats'] = $ideal_stats;
    }

    $new_file_path = $user_data_dir . preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($new_name)) . '.json';

    if ($original_file_path !== $new_file_path && file_put_contents($new_file_path,json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        unlink($original_file_path);
        echo json_encode(['status' => 'success','message'=>'Personaggio aggiornato con successo']);
    } elseif(file_put_contents($original_file_path,json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success','message'=>'Personaggio aggiornato con successo']);
    }
    else {
        echo json_encode(['status' => 'error','message'=>'Errore salvataggio personaggio.']);
    }
}

function delete_character() {
    $char_name = $_POST['character_name'] ?? '';
    if (empty($char_name)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Nome del personaggio mancante.']);
        return;
    }

    $user_data_dir = get_user_data_dir();
    $json_file_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($char_name)) . '.json';
    $file_path = $user_data_dir . $json_file_name;

    if (!file_exists($file_path)) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        return;
    }

    $data = json_decode(file_get_contents($file_path), true);

    if (!empty($data['profile']['splashart']) && file_exists(__DIR__.'/../'.$data['profile']['splashart'])) {
        unlink(__DIR__.'/../'.$data['profile']['splashart']);
    }

    if (unlink($file_path)) {
        echo json_encode(['status' => 'success', 'message' => 'Personaggio eliminato con successo.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Impossibile eliminare il file del personaggio.']);
    }
}

// --- BUILD FUNCTIONS ---
function save_build() {
    $char_name = $_POST['character_name'] ?? '';
    if (empty($char_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Nome personaggio non fornito.']);
        http_response_code(400);
        return;
    }

    $user_data_dir = get_user_data_dir();
    $json_file_name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower($char_name)) . '.json';
    $file_path = $user_data_dir . $json_file_name;

    if (!file_exists($file_path)) {
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        http_response_code(404);
        return;
    }

    $data = json_decode(file_get_contents($file_path), true);

    $new_build = [
        'date' => $_POST['date'] ?? date('Y-m-d'),
        'stats' => $_POST['stats'] ?? [],
        'constellation' => isset($_POST['constellation']) ? intval($_POST['constellation']) : 0,
        'signature_weapon' => $_POST['signature_weapon'] ?? '',
        'talents' => $_POST['talents'] ?? ''
    ];

    if ($new_build['constellation'] > ($data['profile']['constellation'] ?? 0)) {
        $data['profile']['constellation'] = $new_build['constellation'];
    }

    $talents_rank = ['No' => 0, 'Vicino' => 1, 'Sì' => 2];
    $signature_rank = ['No' => 0, 'Buona' => 1, 'Sì' => 2];

    $new_talents_rank = $talents_rank[$new_build['talents']] ?? -1;
    $profile_talents_rank = $talents_rank[$data['profile']['talents']] ?? -1;
    if ($new_talents_rank > $profile_talents_rank) {
        $data['profile']['talents'] = $new_build['talents'];
    }

    $new_signature_rank = $signature_rank[$new_build['signature_weapon']] ?? -1;
    $profile_signature_rank = $signature_rank[$data['profile']['signature_weapon']] ?? -1;
    if ($new_signature_rank > $profile_signature_rank) {
        $data['profile']['signature_weapon'] = $new_build['signature_weapon'];
    }

    array_unshift($data['builds'], $new_build);

    if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Build salvata con successo']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file JSON.']);
        http_response_code(500);
    }
}

function delete_build() {
    $char_name = $_POST['character_name'] ?? '';
    $build_index = $_POST['build_index'] ?? -1;

    if (empty($char_name) || $build_index < 0) {
        echo json_encode(['status' => 'error', 'message' => 'Dati mancanti per la cancellazione.']);
        http_response_code(400);
        return;
    }

    $user_data_dir = get_user_data_dir();
    $json_file_name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower($char_name)) . '.json';
    $file_path = $user_data_dir . $json_file_name;

    if (!file_exists($file_path)) {
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        http_response_code(404);
        return;
    }

    $data = json_decode(file_get_contents($file_path), true);

    if (!isset($data['builds'][$build_index])) {
        echo json_encode(['status' => 'error', 'message' => 'Build non trovata.']);
        http_response_code(404);
        return;
    }

    array_splice($data['builds'], $build_index, 1);

    usort($data['builds'], function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });

    if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Build cancellata con successo']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file JSON.']);
        http_response_code(500);
    }
}

function update_build() {
    $char_name = $_POST['character_name'] ?? '';
    $build_index = $_POST['build_index'] ?? -1;

    if (empty($char_name) || $build_index < 0) {
        echo json_encode(['status' => 'error', 'message' => 'Dati mancanti per la modifica.']);
        http_response_code(400);
        return;
    }

    $user_data_dir = get_user_data_dir();
    $json_file_name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower($char_name)) . '.json';
    $file_path = $user_data_dir . $json_file_name;

    if (!file_exists($file_path)) {
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        http_response_code(404);
        return;
    }

    $data = json_decode(file_get_contents($file_path), true);

    if (!empty($data['builds'])) {
        usort($data['builds'], function($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
        });
    }

    if (!isset($data['builds'][$build_index])) {
        echo json_encode(['status' => 'error', 'message' => 'Build non trovata.']);
        http_response_code(404);
        return;
    }

    $updated_build = [
        'date' => $_POST['date'] ?? date('Y-m-d'),
        'stats' => $_POST['stats'] ?? [],
        'constellation' => isset($_POST['constellation']) ? intval($_POST['constellation']) : 0,
        'signature_weapon' => $_POST['signature_weapon'] ?? '',
        'talents' => $_POST['talents'] ?? ''
    ];

    $data['builds'][$build_index] = $updated_build;

    usort($data['builds'], function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });

    if (file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Build aggiornata con successo']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file JSON.']);
        http_response_code(500);
    }
}

// --- USER & ADMIN FUNCTIONS ---
function get_all_users() {
    if (!is_admin()) {
        http_response_code(403); 
        echo json_encode(['status'=>'error','message'=>'Accesso negato.']); 
        return;
    }
    $users_file = get_users_file();
    if (!file_exists($users_file)) {
        echo json_encode([]);
        return;
    }
    echo json_encode(json_decode(file_get_contents($users_file), true));
}

function update_user() {
    $users_file = get_users_file();
    $users = json_decode(file_get_contents($users_file), true);

    if (!is_array($users)) {
        echo json_encode(['status' => 'error', 'message' => 'File utenti corrotto o vuoto.']);
        return;
    }

    $original_username = $_POST['original_username'] ?? '';
    $new_username = $_POST['username'] ?? '';
    $user_to_update_id = '';

    // Un admin può modificare altri, un utente solo se stesso.
    if (is_admin()) {
        // L'admin trova l'utente da modificare tramite l'username originale
        foreach ($users as $user) {
            if ($user['username'] === $original_username) {
                $user_to_update_id = $user['id'];
                break;
            }
        }
    } else {
        // L'utente normale può modificare solo se stesso, l'ID è in sessione
        if ($_SESSION['username'] !== $original_username) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Permesso negato.']);
            return;
        }
        $user_to_update_id = $_SESSION['user_id'];
    }

    if (empty($user_to_update_id)) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Utente originale non trovato.']);
        return;
    }

    // Controlla se il nuovo username è già stato preso da un ALTRO utente
    if ($original_username !== $new_username) {
        foreach ($users as $u) {
            if ($u['id'] !== $user_to_update_id && $u['username'] === $new_username) {
                echo json_encode(['status' => 'error', 'message' => 'Questo username è già stato preso.']);
                return;
            }
        }
    }

    $user_found = false;
    $new_avatar_path = null;

    foreach ($users as &$user) {
        if ($user['id'] === $user_to_update_id) {
            $user_found = true;
            
            // Aggiorna i campi
            $user['username'] = $new_username;
            if (is_admin() && isset($_POST['role'])) {
                $user['role'] = $_POST['role'];
            }
            if (isset($_POST['background'])) {
                $user['background'] = $_POST['background'];
            }
            if (!empty($_POST['password'])) {
                $user['passwordHash'] = password_hash($_POST['password'], PASSWORD_DEFAULT);
            }

            // Gestione Avatar
            if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] == 0) {
                $upload_dir = __DIR__ . '/../uploads/';
                // Cancella il vecchio avatar se esiste
                if (!empty($user['avatar']) && file_exists(__DIR__ . '/../' . $user['avatar'])) {
                    unlink(__DIR__ . '/../' . $user['avatar']);
                }
                $file_extension = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
                // Nuovo formato nome file: USERID_avatar.ext
                $file_name = $user['id'] . '_avatar.' . $file_extension;
                $target_file = $upload_dir . $file_name;
                if (move_uploaded_file($_FILES['avatar']['tmp_name'], $target_file)) {
                    $user['avatar'] = 'uploads/' . $file_name;
                    $new_avatar_path = $user['avatar'];
                }
            }
            
            break;
        }
    }

    if (!$user_found) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Utente non trovato (ID mismatch).']);
        return;
    }

    // NON c'è più bisogno di rinominare la cartella dati!

    if (file_put_contents($users_file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        // Aggiorna il nome utente in sessione se l'utente ha modificato se stesso
        if ($_SESSION['user_id'] === $user_to_update_id) {
            $_SESSION['username'] = $new_username;
        }
        echo json_encode(['status' => 'success', 'message' => 'Profilo aggiornato con successo.', 'new_avatar_path' => $new_avatar_path]);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare i dati utente.']);
    }
}

function delete_users() {
    if (!is_admin()) {
        http_response_code(403); 
        echo json_encode(['status'=>'error','message'=>'Accesso negato.']); 
        return;
    }
    $users_file = get_users_file();
    $users = json_decode(file_get_contents($users_file), true);
    $username_to_delete = $_POST['username'] ?? '';
    $users = array_filter($users, function($user) use ($username_to_delete) {
        return $user['username'] !== $username_to_delete;
    });
    file_put_contents($users_file, json_encode(array_values($users), JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success', 'message' => 'Utente eliminato con successo.']);
}

function register() {
    if (!is_admin()) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Solo gli amministratori possono registrare nuovi utenti.']);
        return;
    }

    $users_file = get_users_file();
    $users = file_exists($users_file) ? json_decode(file_get_contents($users_file), true) : [];

    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    if (empty($username) || empty($password)) {
        echo json_encode(['status' => 'error', 'message' => 'Username e password sono obbligatori.']);
        return;
    }

    foreach ($users as $user) {
        if ($user['username'] === $username) {
            echo json_encode(['status' => 'error', 'message' => 'Username già esistente.']);
            return;
        }
    }

    $new_user_id = 'user_' . str_replace('.', '', uniqid('', true));

    $users[] = [
        'id' => $new_user_id, // Aggiungi ID anche alla registrazione
        'username' => $username,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => $_POST['role'] ?? 'user',
        'avatar' => ''
    ];

    file_put_contents($users_file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['status' => 'success', 'message' => 'Utente aggiunto con successo.']);
}

function sync_library() {
    $src_dir = __DIR__ . '/../librarydata';
    $dst_dir = __DIR__ . '/../data';

    if (!is_dir($src_dir)) {
        echo json_encode(['status' => 'error', 'message' => 'La cartella di origine (librarydata) non esiste.']);
        return;
    }
    if (!is_dir($dst_dir)) mkdir($dst_dir, 0777, true);

    // 1. Unione intelligente del file characters_list.json
    $src_json_file = $src_dir . '/characters_list.json';
    $dst_json_file = $dst_dir . '/characters_list.json';

    $src_list = file_exists($src_json_file) ? json_decode(file_get_contents($src_json_file), true) : [];
    $dst_list = file_exists($dst_json_file) ? json_decode(file_get_contents($dst_json_file), true) : [];

    if (!is_array($src_list)) $src_list = [];
    if (!is_array($dst_list)) $dst_list = [];

    $merged_chars = [];
    foreach (array_merge($dst_list, $src_list) as $char) {
        if (isset($char['nome'])) {
            $merged_chars[$char['nome']] = $char; // Usa il nome come chiave per eliminare duplicati
        }
    }

    $final_list = array_values($merged_chars); // Riconverte in un array indicizzato
    usort($final_list, function($a, $b) {
        return strcasecmp($a['nome'] ?? '', $b['nome'] ?? '');
    });

    // Salva la lista unificata in entrambe le posizioni per mantenerle allineate
    file_put_contents($dst_json_file, json_encode($final_list, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    file_put_contents($src_json_file, json_encode($final_list, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // 2. Copia incrementale dei file immagine
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($src_dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $item) {
        $dest_item_path = $dst_dir . '/' . $iterator->getSubPathName();
        if ($item->isDir()) {
            if (!is_dir($dest_item_path)) {
                mkdir($dest_item_path, 0777, true);
            }
        } else {
            // Copia solo se il file non è il JSON che abbiamo già gestito
            if ($item->getFilename() !== 'characters_list.json') {
                copy($item, $dest_item_path);
            }
        }
    }

    echo json_encode(['status' => 'success', 'message' => 'Sincronizzazione incrementale completata con successo.']);
}

function add_character_to_library() {
    $char_name = $_POST['name'] ?? '';
    if (empty($char_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Il nome del personaggio è obbligatorio.']);
        return;
    }

    $library_file = __DIR__ . '/../data/characters_list.json';
    $library = file_exists($library_file) ? json_decode(file_get_contents($library_file), true) : [];
    if (!is_array($library)) $library = [];

    foreach ($library as $char) {
        if (strcasecmp($char['nome'], $char_name) == 0) {
            echo json_encode(['status' => 'error', 'message' => 'Un personaggio con questo nome esiste già.']);
            return;
        }
    }

    if (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        $upload_dir = __DIR__ . '/../data/library/';
        if(!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

        $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $char_name);
        $file_ext = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $file_name = 'character_' . $safe_char_name . '_wish.' . $file_ext;
        $target_file = $upload_dir . $file_name;

        if (move_uploaded_file($_FILES['splashart']['tmp_name'], $target_file)) {
            $new_char = [
                'nome' => $char_name,
                'immagine' => 'library/' . $file_name,
                'titolo' => $_POST['title'] ?? '',
                'elemento' => $_POST['element'] ?? '',
                'arma' => $_POST['weapon'] ?? '',
                'rarita' => $_POST['rarity'] ?? '5-star',
            ];
            $library[] = $new_char;

            usort($library, function($a, $b) { return strcasecmp($a['nome'], $b['nome']); });

            if (file_put_contents($library_file, json_encode($library, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
                echo json_encode(['status' => 'success', 'message' => "Personaggio '{$char_name}' aggiunto!"]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file della libreria.']);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Errore durante il caricamento dell\'immagine.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'L\'immagine dello splashart è obbligatoria.']);
    }
}

function sync_character_across_all_users($character_name, $new_data) {
    $users_dir = __DIR__ . '/../data/users/';
    $user_folders = glob($users_dir . '*', GLOB_ONLYDIR);
    $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($character_name));
    $char_file_name = $safe_char_name . '.json';

    foreach ($user_folders as $user_folder) {
        $char_file_path = $user_folder . '/' . $char_file_name;
        if (file_exists($char_file_path)) {
            $user_char_data = json_decode(file_get_contents($char_file_path), true);
            
            // Update only the library-managed fields
            $user_char_data['profile']['element'] = $new_data['elemento'];
            $user_char_data['profile']['rarity'] = $new_data['rarita'];
            $user_char_data['profile']['weapon'] = $new_data['arma'];
            $user_char_data['profile']['title'] = $new_data['titolo'];
            
            // Also update the default splashart if the user hasn't set a custom one
            // This assumes custom splasharts are in /uploads/ and library ones in /data/library/
            if (strpos($user_char_data['profile']['splashart'], 'data/library/') !== false) {
                 $user_char_data['profile']['splashart'] = 'data/' . $new_data['immagine'];
            }

            file_put_contents($char_file_path, json_encode($user_char_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
    }
}

function update_library_character() {
    $original_name = $_POST['original_name'] ?? '';
    $new_name = $_POST['name'] ?? '';

    if (empty($original_name) || empty($new_name)) {
        echo json_encode(['status' => 'error', 'message' => 'I nomi sono obbligatori.']);
        return;
    }

    $library_file = __DIR__ . '/../data/characters_list.json';
    $library = json_decode(file_get_contents($library_file), true);
    
    $char_index = -1;
    foreach ($library as $index => $char) {
        if ($char['nome'] === $original_name) {
            $char_index = $index;
            break;
        }
    }

    if ($char_index === -1) {
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        return;
    }

    // Update fields
    $updated_char_data = &$library[$char_index];
    $updated_char_data['nome'] = $new_name;
    $updated_char_data['titolo'] = $_POST['title'] ?? '';
    $updated_char_data['elemento'] = $_POST['element'] ?? '';
    $updated_char_data['arma'] = $_POST['weapon'] ?? '';
    $updated_char_data['rarita'] = $_POST['rarity'] ?? '5-star';

    if (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        $upload_dir = __DIR__ . '/../data/library/';
        if(!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

        // Delete old image if it exists
        if (!empty($updated_char_data['immagine']) && file_exists(__DIR__ . '/../data/' . $updated_char_data['immagine'])) {
            unlink(__DIR__ . '/../data/' . $updated_char_data['immagine']);
        }

        $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $new_name);
        $file_ext = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $file_name = 'character_' . $safe_char_name . '_wish.' . $file_ext;
        $target_file = $upload_dir . $file_name;

        if (move_uploaded_file($_FILES['splashart']['tmp_name'], $target_file)) {
            $updated_char_data['immagine'] = 'library/' . $file_name;
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Errore caricamento nuova immagine.']);
            return;
        }
    }

    usort($library, function($a, $b) { return strcasecmp($a['nome'], $b['nome']); });

    if (file_put_contents($library_file, json_encode($library, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        // Trigger synchronization
        sync_character_across_all_users($original_name, $updated_char_data);
        if ($original_name !== $new_name) {
            // If name changed, we might need to rename files, but that's more complex.
            // For now, we just sync data.
        }

        echo json_encode(['status' => 'success', 'message' => 'Personaggio aggiornato e sincronizzato!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file della libreria.']);
    }
}


// --- ROUTER ---
$action = $_REQUEST['action'] ?? '';

$public_actions = ['login', 'logout', 'check_session', 'get_elements'];
$user_actions   = ['get_all_characters', 'save_character', 'update_character', 'save_build', 'update_build', 'delete_build', 'update_user', 'delete_character', 'get_backgrounds'];
$admin_actions  = ['get_all_users', 'delete_users', 'register', 'sync_library', 'add_character_to_library', 'update_library_character', 'upload_background', 'delete_background', 'get_user_schema', 'save_user_schema', 'enforce_user_schema', 'add_element', 'update_element_icon'];

if (in_array($action, $public_actions)) {
    $action();
} elseif (in_array($action, $user_actions)) {
    if (!is_logged_in()) { 
        http_response_code(401); 
        echo json_encode(['status'=>'error','message'=>'Accesso non effettuato.']); 
        exit; 
    }
    $action();
} elseif (in_array($action, $admin_actions)) {
    if (!is_admin()) { 
        http_response_code(403); 
        echo json_encode(['status'=>'error','message'=>'Accesso negato.']); 
        exit; 
    }
    $action();
} else {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'Azione non valida.']);
}