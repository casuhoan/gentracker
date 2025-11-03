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

function is_moderator() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'moderator';
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

function get_settings_file() {
    return __DIR__ . '/../data/settings.json';
}

function get_character_schema_file() {
    return __DIR__ . '/../data/character_schema.json';
}

function get_keyword_colors_file() {
    return __DIR__ . '/../data/keyword_colors.json';
}

function get_keyword_tooltips_file() {
    return __DIR__ . '/../data/keyword_tooltips.json';
}

function get_tickets_dir() {
    $dir = __DIR__ . '/../data/tickets/';
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    return $dir;
}

function get_open_tickets_file() {
    return get_tickets_dir() . 'ticket_aperti.json';
}

function get_closed_tickets_file() {
    return get_tickets_dir() . 'ticket_chiusi.json';
}

function get_ticket_log_file() {
    return get_tickets_dir() . 'log.txt';
}

function get_nations_file() {
    return __DIR__ . '/../data/nations.json';
}

function get_weapons_file() {
    return __DIR__ . '/../data/weapons.json';
}

function get_weapon_icons_dir() {
    $dir = __DIR__ . '/../data/icons/weapons/';
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    return $dir;
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

// --- WEAPON FUNCTIONS ---
function get_weapons() {
    $weapons_file = get_weapons_file();
    if (!file_exists($weapons_file)) {
        file_put_contents($weapons_file, '[]');
    }
    get_weapon_icons_dir(); // Ensure the directory exists
    header('Content-Type: application/json');
    echo file_get_contents($weapons_file);
}

function add_weapon() {
    $weapons_file = get_weapons_file();
    $weapons = json_decode(file_get_contents($weapons_file), true);

    $weapon_name = $_POST['weapon_name'] ?? '';
    if (empty($weapon_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Il nome dell\'arma è obbligatorio.']);
        return;
    }

    foreach ($weapons as $w) {
        if (strcasecmp($w['name'], $weapon_name) == 0) {
            echo json_encode(['status' => 'error', 'message' => 'Un\'arma con questo nome esiste già.']);
            return;
        }
    }

    $icon_path = '';
    if (isset($_FILES['weapon_icon']) && $_FILES['weapon_icon']['error'] == 0) {
        $icons_dir = get_weapon_icons_dir();
        $file_ext = pathinfo($_FILES['weapon_icon']['name'], PATHINFO_EXTENSION);
        $safe_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($weapon_name));
        $file_name = $safe_name . '.' . $file_ext;
        $target_file = $icons_dir . $file_name;

        if (move_uploaded_file($_FILES['weapon_icon']['tmp_name'], $target_file)) {
            $icon_path = $file_name;
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Errore durante il caricamento dell\'icona.']);
            return;
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'L\'icona è obbligatoria.']);
        return;
    }

    $weapons[] = ['name' => $weapon_name, 'icon' => $icon_path];
    file_put_contents($weapons_file, json_encode($weapons, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success']);
}

function update_weapon_icon() {
    $weapons_file = get_weapons_file();
    $weapons = json_decode(file_get_contents($weapons_file), true);
    
    $weapon_name = $_POST['weapon_name'] ?? '';
    if (empty($weapon_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Nome arma non specificato.']);
        return;
    }

    $icon_path = '';
    if (isset($_FILES['weapon_icon']) && $_FILES['weapon_icon']['error'] == 0) {
        $icons_dir = get_weapon_icons_dir();
        $file_ext = pathinfo($_FILES['weapon_icon']['name'], PATHINFO_EXTENSION);
        $safe_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($weapon_name));
        $file_name = $safe_name . '.' . $file_ext;
        $target_file = $icons_dir . $file_name;

        foreach ($weapons as $w) {
            if ($w['name'] === $weapon_name && !empty($w['icon']) && $w['icon'] !== $file_name) {
                $old_icon_path = $icons_dir . $w['icon'];
                if (file_exists($old_icon_path)) {
                    unlink($old_icon_path);
                }
                break;
            }
        }

        if (move_uploaded_file($_FILES['weapon_icon']['tmp_name'], $target_file)) {
            $icon_path = $file_name;
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Errore durante il caricamento della nuova icona.']);
            return;
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Nessuna icona caricata.']);
        return;
    }

    foreach ($weapons as &$w) {
        if ($w['name'] === $weapon_name) {
            $w['icon'] = $icon_path;
            break;
        }
    }

    file_put_contents($weapons_file, json_encode($weapons, JSON_PRETTY_PRINT));
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
            'opacity' => $found_user['opacity'] ?? 'no',
            'grimoire_view' => $found_user['grimoire_view'] ?? 'splash'
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

function upload_favicon() {
    if (!isset($_FILES['favicon_file']) || $_FILES['favicon_file']['error'] != 0) {
        echo json_encode(['status' => 'error', 'message' => 'Nessun file caricato o errore nel caricamento.']);
        return;
    }

    $favicon_dir = __DIR__ . '/../data/favicons/';
    if (!is_dir($favicon_dir)) {
        mkdir($favicon_dir, 0777, true);
    }

    // Rimuovi vecchie favicon per tenerne solo una
    $existing_favicons = glob($favicon_dir . 'favicon.*');
    foreach ($existing_favicons as $existing) {
        unlink($existing);
    }

    $file_ext = pathinfo($_FILES['favicon_file']['name'], PATHINFO_EXTENSION);
    $file_name = 'favicon.' . $file_ext;
    $target_file = $favicon_dir . $file_name;

    if (move_uploaded_file($_FILES['favicon_file']['tmp_name'], $target_file)) {
        echo json_encode(['status' => 'success', 'message' => 'Favicon caricata con successo.', 'path' => 'data/favicons/' . $file_name]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Errore durante il salvataggio della favicon.']);
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
                $content['profile']['latest_talents'] = $content['builds'][0]['talents'] ?? $content['profile']['talents'] ?? '';
                $content['profile']['latest_signature_weapon'] = $content['builds'][0]['signature_weapon'] ?? $content['profile']['signature_weapon'] ?? '';
            } else {
                $content['profile']['latest_constellation'] = $content['profile']['constellation'] ?? 0;
                $content['profile']['latest_talents'] = $content['profile']['talents'] ?? '';
                $content['profile']['latest_signature_weapon'] = $content['profile']['signature_weapon'] ?? '';
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

    // Gestione Immagine
    if (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        $user_splash_dir = __DIR__ . '/../data/splashart/splashart_' . $_SESSION['user_id'] . '/';
        if (!is_dir($user_splash_dir)) mkdir($user_splash_dir, 0777, true);
        
        $file_extension = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($char_name));
        $file_name = $safe_char_name . '_' . time() . '.' . $file_extension; // Add timestamp to avoid collisions
        $target_file = $user_splash_dir . $file_name;

        if (move_uploaded_file($_FILES['splashart']['tmp_name'], $target_file)) {
            $splashart_path = 'data/splashart/splashart_' . $_SESSION['user_id'] . '/' . $file_name;
        }
    } elseif (!empty($default_image_path)) {
        // The default image path is already correct from the library, e.g., 'data/splashart/Albedo_Wish.webp'
        $splashart_path = $default_image_path;
    }

    $ideal_stats = [];
    if(isset($_POST['ideal_stats']) && is_array($_POST['ideal_stats'])){
        foreach($_POST['ideal_stats'] as $stat => $value){
            if(!empty($value)){
                if ($stat === 'Goblet Elementale') {
                    $ideal_stats[$stat] = $value; // Save as string
                } else {
                    $ideal_stats[$stat] = floatval($value);
                }
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
            'rarity' => $_POST['rarity'] ?? '5-star',
            'nation' => $_POST['nation'] ?? '',
            'faction' => $_POST['faction'] ?? ''
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

    // Gestione Immagine
    $default_image_path = $_POST['default_image_path'] ?? '';
    $new_splashart_path = $data['profile']['splashart'] ?? ''; // Keep old path by default

    if (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        // New file uploaded
        $user_splash_dir = __DIR__ . '/../data/splashart/splashart_' . $_SESSION['user_id'] . '/';
        if (!is_dir($user_splash_dir)) mkdir($user_splash_dir, 0777, true);

        $file_extension = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($new_name));
        $file_name = $safe_char_name . '_' . time() . '.' . $file_extension;
        $target_file = $user_splash_dir . $file_name;

        if (move_uploaded_file($_FILES['splashart']['tmp_name'], $target_file)) {
            // Delete old file if it exists and is different
            if (!empty($data['profile']['splashart']) && $data['profile']['splashart'] !== 'data/splashart/splashart_' . $_SESSION['user_id'] . '/' . $file_name) {
                $old_file_path = __DIR__ . '/../' . $data['profile']['splashart'];
                if (file_exists($old_file_path)) unlink($old_file_path);
            }
            $new_splashart_path = 'data/splashart/splashart_' . $_SESSION['user_id'] . '/' . $file_name;
        }
    } elseif (!empty($default_image_path)) {
        // Default image selected
        // Delete old custom file if it exists
        if (!empty($data['profile']['splashart']) && strpos($data['profile']['splashart'], 'splashart_' . $_SESSION['user_id']) !== false) {
             $old_file_path = __DIR__ . '/../' . $data['profile']['splashart'];
             if (file_exists($old_file_path)) unlink($old_file_path);
        }
        $new_splashart_path = $default_image_path;
    }
    $data['profile']['splashart'] = $new_splashart_path;

    $data['profile']['name'] = $new_name;
    $fields = ['element','role','tracked_stats','acquisition_date','signature_weapon','talents','rarity', 'nation', 'faction'];
    foreach($fields as $f) {
        if(isset($_POST[$f])) $data['profile'][$f] = $_POST[$f];
    }
    if(isset($_POST['constellation'])) $data['profile']['constellation'] = intval($_POST['constellation']);
    if(isset($_POST['ideal_stats']) && is_array($_POST['ideal_stats'])) {
        $ideal_stats = [];
        foreach($_POST['ideal_stats'] as $stat => $val) {
            if($val !== '') {
                if ($stat === 'Goblet Elementale') {
                    $ideal_stats[$stat] = $val; // Save as string
                } else {
                    $ideal_stats[$stat] = floatval($val);
                }
            }
        }
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
    if (!is_admin() && !is_moderator()) {
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

    // Admin and moderators can edit other users.
    if (is_admin() || is_moderator()) {
        foreach ($users as $user) {
            if ($user['username'] === $original_username) {
                $user_to_update_id = $user['id'];
                break;
            }
        }
    } else {
        // A normal user can only edit themselves.
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

    // Check if the new username is already taken by ANOTHER user
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

            // Moderator cannot edit an admin
            if (is_moderator() && $user['role'] === 'admin') {
                http_response_code(403);
                echo json_encode(['status' => 'error', 'message' => 'Un moderatore non può modificare un amministratore.']);
                return;
            }

            // Update fields
            $user['username'] = $new_username;

            // Role update logic
            if (isset($_POST['role'])) {
                if (is_admin()) {
                    $user['role'] = $_POST['role'];
                } elseif (is_moderator()) {
                    if ($_POST['role'] === 'admin') {
                        http_response_code(403);
                        echo json_encode(['status' => 'error', 'message' => 'Un moderatore non può promuovere un utente ad amministratore.']);
                        return;
                    }
                    $user['role'] = $_POST['role'];
                }
            }

            if (isset($_POST['background'])) {
                $user['background'] = $_POST['background'];
            }
            if (isset($_POST['opacity'])) {
                $user['opacity'] = $_POST['opacity'];
            }
            if (isset($_POST['grimoire_view'])) {
                $user['grimoire_view'] = $_POST['grimoire_view'];
            }
            if (!empty($_POST['password'])) {
                $user['passwordHash'] = password_hash($_POST['password'], PASSWORD_DEFAULT);
            }

            // Avatar management
            if (isset($_POST['avatar_path']) && !empty($_POST['avatar_path'])) {
                $new_avatar_path = $_POST['avatar_path'];
                if (strpos($new_avatar_path, 'data/') === 0 && file_exists(__DIR__ . '/../' . $new_avatar_path)) {
                    if (!empty($user['avatar']) && strpos($user['avatar'], 'uploads/') === 0 && file_exists(__DIR__ . '/../' . $user['avatar'])) {
                        unlink(__DIR__ . '/../' . $user['avatar']);
                    }
                    $user['avatar'] = $new_avatar_path;
                }
            } elseif (isset($_FILES['avatar']) && $_FILES['avatar']['error'] == 0) {
                $upload_dir = __DIR__ . '/../uploads/';
                if (!empty($user['avatar']) && file_exists(__DIR__ . '/../' . $user['avatar'])) {
                    unlink(__DIR__ . '/../' . $user['avatar']);
                }
                $file_extension = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
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

    if (file_put_contents($users_file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
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
    if (!is_admin() && !is_moderator()) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Solo amministratori o moderatori possono registrare nuovi utenti.']);
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

    $role = 'user'; // Default role
    if (is_admin() && isset($_POST['role'])) {
        $role = $_POST['role']; // Admins can set any role
    }

    $new_user_id = 'user_' . str_replace('.', '', uniqid('', true));

    $users[] = [
        'id' => $new_user_id,
        'username' => $username,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => $role,
        'avatar' => ''
    ];

    file_put_contents($users_file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['status' => 'success', 'message' => 'Utente aggiunto con successo.']);
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

    $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $char_name);

    $splashart_path = '';
    if (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        $splashart_dir = __DIR__ . '/../data/splashart/';
        if(!is_dir($splashart_dir)) mkdir($splashart_dir, 0777, true);

        $file_ext = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $file_name = 'character_' . $safe_char_name . '_wish.' . $file_ext;
        if (move_uploaded_file($_FILES['splashart']['tmp_name'], $splashart_dir . $file_name)) {
            $splashart_path = 'splashart/' . $file_name; // Path relative to /data/
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Errore durante il caricamento dello splashart.']);
            return;
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'L\'immagine dello splashart è obbligatoria.']);
        return;
    }

    // Icon and Banner still go to /data/library/
    $library_upload_dir = __DIR__ . '/../data/library/';
    if(!is_dir($library_upload_dir)) mkdir($library_upload_dir, 0777, true);

    $icon_path = '';
    if (isset($_FILES['icon']) && $_FILES['icon']['error'] == 0) {
        $file_ext = pathinfo($_FILES['icon']['name'], PATHINFO_EXTENSION);
        $file_name = 'character_' . $safe_char_name . '_icon.' . $file_ext;
        if (move_uploaded_file($_FILES['icon']['tmp_name'], $library_upload_dir . $file_name)) {
            $icon_path = 'library/' . $file_name;
        }
    }

    $banner_path = '';
    if (isset($_FILES['banner']) && $_FILES['banner']['error'] == 0) {
        $file_ext = pathinfo($_FILES['banner']['name'], PATHINFO_EXTENSION);
        $file_name = 'character_' . $safe_char_name . '_banner.' . $file_ext;
        if (move_uploaded_file($_FILES['banner']['tmp_name'], $library_upload_dir . $file_name)) {
            $banner_path = 'library/' . $file_name;
        }
    }

    $new_char = [
        'nome' => $char_name,
        'immagine' => $splashart_path,
        'icon' => $icon_path,
        'banner' => $banner_path,
        'titolo' => $_POST['title'] ?? '',
        'elemento' => $_POST['element'] ?? '',
        'arma' => $_POST['weapon'] ?? '',
        'rarita' => $_POST['rarity'] ?? '5-star',
        'nazione' => $_POST['nazione'] ?? '',
        'fazione' => $_POST['fazione'] ?? '',
        'wip' => isset($_POST['wip']),
    ];
    $library[] = $new_char;

    usort($library, function($a, $b) { return strcasecmp($a['nome'], $b['nome']); });

    if (file_put_contents($library_file, json_encode($library, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => "Personaggio '{$char_name}' aggiunto!"]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file della libreria.']);
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
    $updated_char_data['nazione'] = $_POST['nazione'] ?? '';
    $updated_char_data['fazione'] = $_POST['fazione'] ?? '';
    $updated_char_data['wip'] = isset($_POST['wip']);

    $safe_char_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $new_name);

    // Handle Splashart
    if (isset($_FILES['splashart']) && $_FILES['splashart']['error'] == 0) {
        $splashart_dir = __DIR__ . '/../data/splashart/';
        if(!is_dir($splashart_dir)) mkdir($splashart_dir, 0777, true);

        if (!empty($updated_char_data['immagine']) && file_exists(__DIR__ . '/../data/' . $updated_char_data['immagine'])) {
            unlink(__DIR__ . '/../data/' . $updated_char_data['immagine']);
        }
        $file_ext = pathinfo($_FILES['splashart']['name'], PATHINFO_EXTENSION);
        $file_name = 'character_' . $safe_char_name . '_wish.' . $file_ext;
        if (move_uploaded_file($_FILES['splashart']['tmp_name'], $splashart_dir . $file_name)) {
            $updated_char_data['immagine'] = 'splashart/' . $file_name;
        }
    }

    // Handle Icon and Banner (they still go to /library)
    $library_upload_dir = __DIR__ . '/../data/library/';
    if(!is_dir($library_upload_dir)) mkdir($library_upload_dir, 0777, true);

    if (isset($_FILES['icon']) && $_FILES['icon']['error'] == 0) {
        if (!empty($updated_char_data['icon']) && file_exists(__DIR__ . '/../data/' . $updated_char_data['icon'])) {
            unlink(__DIR__ . '/../data/' . $updated_char_data['icon']);
        }
        $file_ext = pathinfo($_FILES['icon']['name'], PATHINFO_EXTENSION);
        $file_name = 'character_' . $safe_char_name . '_icon.' . $file_ext;
        if (move_uploaded_file($_FILES['icon']['tmp_name'], $library_upload_dir . $file_name)) {
            $updated_char_data['icon'] = 'library/' . $file_name;
        }
    }

    if (isset($_FILES['banner']) && $_FILES['banner']['error'] == 0) {
        if (!empty($updated_char_data['banner']) && file_exists(__DIR__ . '/../data/' . $updated_char_data['banner'])) {
            unlink(__DIR__ . '/../data/' . $updated_char_data['banner']);
        }
        $file_ext = pathinfo($_FILES['banner']['name'], PATHINFO_EXTENSION);
        $file_name = 'character_' . $safe_char_name . '_banner.' . $file_ext;
        if (move_uploaded_file($_FILES['banner']['tmp_name'], $library_upload_dir . $file_name)) {
            $updated_char_data['banner'] = 'library/' . $file_name;
        }
    }

    usort($library, function($a, $b) { return strcasecmp($a['nome'], $b['nome']); });

    if (file_put_contents($library_file, json_encode($library, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        sync_character_across_all_users($original_name, $updated_char_data);
        if ($original_name !== $new_name) {
            // Future logic for renaming files if needed
        }

        echo json_encode(['status' => 'success', 'message' => 'Personaggio aggiornato e sincronizzato!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file della libreria.']);
    }
}

function get_settings() {
    $settings_file = get_settings_file();
    if (!file_exists($settings_file)) {
        echo json_encode(['grimoire_background' => null]);
        return;
    }
    echo file_get_contents($settings_file);
}

function upload_grimoire_background() {
    if (!isset($_FILES['grimoire_background_image']) || $_FILES['grimoire_background_image']['error'] != 0) {
        echo json_encode(['status' => 'error', 'message' => 'Nessun file caricato o errore nel caricamento.']);
        return;
    }

    $bg_dir = get_backgrounds_dir();
    if (!is_dir($bg_dir)) {
        mkdir($bg_dir, 0777, true);
    }

    $file_name = basename($_FILES['grimoire_background_image']['name']);
    $target_file = $bg_dir . $file_name;

    if (move_uploaded_file($_FILES['grimoire_background_image']['tmp_name'], $target_file)) {
        $settings_file = get_settings_file();
        $settings = [];
        if (file_exists($settings_file)) {
            $settings = json_decode(file_get_contents($settings_file), true);
            if (!is_array($settings)) { // Gestisce file vuoto o corrotto
                $settings = [];
            }
        }
        $settings['grimoire_background'] = $file_name;
        file_put_contents($settings_file, json_encode($settings, JSON_PRETTY_PRINT));
        echo json_encode(['status' => 'success', 'message' => 'Sfondo della libreria caricato con successo.', 'background_file' => $file_name]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Errore durante il salvataggio dello sfondo.']);
    }
}

function get_character_schema() {
    header('Content-Type: application/json'); // Spostato all'inizio
    $schema_file = get_character_schema_file();
    if (!file_exists($schema_file)) {
        // Crea uno schema di default se il file non esiste
        $default_schema = [
            [
                "name" => "nome",
                "label" => "Nome",
                "type" => "text",
                "required" => true,
                "editable" => false
            ],
            [
                "name" => "titolo",
                "label" => "Titolo",
                "type" => "text",
                "required" => false,
                "editable" => true
            ],
            [
                "name" => "elemento",
                "label" => "Elemento",
                "type" => "select",
                "optionsSource" => "elements",
                "required" => true,
                "editable" => true
            ],
            [
                "name" => "arma",
                "label" => "Arma",
                "type" => "text",
                "required" => false,
                "editable" => true
            ],
            [
                "name" => "rarita",
                "label" => "Rarità",
                "type" => "radio",
                "options" => [
                    "4-star",
                    "5-star"
                ],
                "required" => true,
                "editable" => true
            ],
            [
                "name" => "immagine",
                "label" => "Immagine",
                "type" => "file",
                "required" => true,
                "editable" => false
            ]
        ];
        file_put_contents($schema_file, json_encode($default_schema, JSON_PRETTY_PRINT));
        echo json_encode($default_schema);
        return;
    }
    echo file_get_contents($schema_file);
}

function save_character_schema() {
    $data = json_decode(file_get_contents('php://input'), true);
    $schema = $data['schema'] ?? null;

    if ($schema === null) {
        echo json_encode(['status' => 'error', 'message' => 'Nessun dato dello schema ricevuto.']);
        return;
    }

    if (file_put_contents(get_character_schema_file(), json_encode($schema, JSON_PRETTY_PRINT))) {
        echo json_encode(['status' => 'success', 'message' => 'Schema dei personaggi salvato con successo.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare lo schema dei personaggi.']);
    }
}

function update_character_description() {
    if (!is_admin() && !is_moderator()) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Accesso negato.']);
        return;
    }

    $character_name = $_POST['character_name'] ?? '';
    $description = $_POST['description'] ?? '';

    if (empty($character_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Nome del personaggio non fornito.']);
        return;
    }

    $library_file = __DIR__ . '/../data/characters_list.json';
    $library = json_decode(file_get_contents($library_file), true);
    
    $char_index = -1;
    foreach ($library as $index => $char) {
        if ($char['nome'] === $character_name) {
            $char_index = $index;
            break;
        }
    }

    if ($char_index === -1) {
        echo json_encode(['status' => 'error', 'message' => 'Personaggio non trovato.']);
        return;
    }

    $library[$char_index]['description'] = $description;

    if (file_put_contents($library_file, json_encode($library, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Descrizione aggiornata.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file della libreria.']);
    }
}

function sync_library_images() {
    $src_dir = __DIR__ . '/../librarydata/immaginimini';
    $dst_dir = __DIR__ . '/../data/library';

    if (!is_dir($src_dir)) {
        echo json_encode(['status' => 'error', 'message' => 'La cartella di origine (librarydata/immaginimini) non esiste.']);
        return;
    }
    if (!is_dir($dst_dir)) {
        mkdir($dst_dir, 0777, true);
    }

    // Copy all files from src_dir to dst_dir
    $files = glob($src_dir . '/*');
    foreach ($files as $file) {
        $file_to_go = $dst_dir . '/' . basename($file);
        copy($file, $file_to_go);
    }

    // Update characters_list.json
    $characters_file = __DIR__ . '/../data/characters_list.json';
    if (!file_exists($characters_file)) {
        echo json_encode(['status' => 'error', 'message' => 'Il file characters_list.json non esiste.']);
        return;
    }

    $characters = json_decode(file_get_contents($characters_file), true);
    if (!is_array($characters)) {
        echo json_encode(['status' => 'error', 'message' => 'Il file characters_list.json è corrotto.']);
        return;
    }

    foreach ($characters as &$character) {
        if (isset($character['nome'])) {
            $nome = $character['nome'];
            $safe_nome = str_replace(' ', '_', $nome);
            $character['icon'] = 'library/' . $safe_nome . '_Icon.webp';
            $character['banner'] = 'library/' . $safe_nome . '_Card.webp';
        }
    }

    if (file_put_contents($characters_file, json_encode($characters, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode(['status' => 'success', 'message' => 'Immagini della libreria sincronizzate con successo.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Impossibile salvare il file characters_list.json.']);
    }
}

function get_keyword_settings() {
    $colors_file = get_keyword_colors_file();
    if (!file_exists($colors_file)) {
        file_put_contents($colors_file, '[]');
    }

    $tooltips_file = get_keyword_tooltips_file();
    if (!file_exists($tooltips_file)) {
        file_put_contents($tooltips_file, '[]');
    }

    $colors = json_decode(file_get_contents($colors_file), true);
    $tooltips = json_decode(file_get_contents($tooltips_file), true);

    echo json_encode([
        'status' => 'success',
        'colors' => is_array($colors) ? $colors : [],
        'tooltips' => is_array($tooltips) ? $tooltips : []
    ]);
}

function save_keyword_settings() {
    $data = json_decode(file_get_contents('php://input'), true);
    $colors = $data['colors'] ?? null;
    $tooltips = $data['tooltips'] ?? null;

    if ($colors === null || $tooltips === null) {
        echo json_encode(['status' => 'error', 'message' => 'Dati mancanti.']);
        return;
    }

    $colors_file = get_keyword_colors_file();
    $tooltips_file = get_keyword_tooltips_file();

    $save_colors = file_put_contents($colors_file, json_encode($colors, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    $save_tooltips = file_put_contents($tooltips_file, json_encode($tooltips, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    if ($save_colors !== false && $save_tooltips !== false) {
        echo json_encode(['status' => 'success', 'message' => 'Impostazioni parole chiave salvate.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Errore durante il salvataggio delle impostazioni.']);
    }
}

function submit_ticket() {
    if (!is_logged_in()) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Devi essere loggato per inviare un ticket.']);
        return;
    }

    $title = $_POST['title'] ?? '';
    $content = $_POST['content'] ?? '';
    $character_name = $_POST['character_name'] ?? '';

    if (empty($title) || empty($content) || empty($character_name)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Titolo, personaggio e contenuto sono obbligatori.']);
        return;
    }

    // Ensure directory and files exist
    get_tickets_dir();
    $open_tickets_file = get_open_tickets_file();
    $closed_tickets_file = get_closed_tickets_file();
    $log_file = get_ticket_log_file();

    if (!file_exists($open_tickets_file)) file_put_contents($open_tickets_file, '[]');
    if (!file_exists($closed_tickets_file)) file_put_contents($closed_tickets_file, '[]');
    if (!file_exists($log_file)) file_put_contents($log_file, '');

    $open_tickets = json_decode(file_get_contents($open_tickets_file), true);
    $closed_tickets = json_decode(file_get_contents($closed_tickets_file), true);

    // Generate new sequential ID
    $new_id = count($open_tickets) + count($closed_tickets) + 1;

    $new_ticket = [
        'id' => $new_id,
        'user' => $_SESSION['username'],
        'character_name' => $character_name,
        'title' => $title,
        'content' => $content,
        'timestamp' => date('c') // ISO 8601 format
    ];

    $open_tickets[] = $new_ticket;

    file_put_contents($open_tickets_file, json_encode($open_tickets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Format new log entry
    $log_entry = sprintf("[#%s] [%s] [%s] %s\n", $new_ticket['id'], date('d/m/Y H:i:s'), $new_ticket['user'], $new_ticket['title']);
    file_put_contents($log_file, $log_entry, FILE_APPEND);

    echo json_encode(['status' => 'success', 'message' => 'Ticket inviato con successo.']);
}

function get_tickets() {
    // Admin check is handled by the router
    $open_tickets_file = get_open_tickets_file();
    $closed_tickets_file = get_closed_tickets_file();

    $open_tickets = file_exists($open_tickets_file) ? json_decode(file_get_contents($open_tickets_file), true) : [];
    $closed_tickets = file_exists($closed_tickets_file) ? json_decode(file_get_contents($closed_tickets_file), true) : [];

    echo json_encode([
        'status' => 'success',
        'open_tickets' => is_array($open_tickets) ? array_reverse($open_tickets) : [], // Show newest first
        'closed_tickets' => is_array($closed_tickets) ? array_reverse($closed_tickets) : [] // Show newest first
    ]);
}

function close_ticket() {
    // Admin check is handled by the router
    $ticket_id = $_POST['ticket_id'] ?? '';

    if ($ticket_id === '') { // Use strict check for empty string, as '0' could be a valid ID in other contexts
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'ID del ticket mancante.']);
        return;
    }

    $ticket_id_to_find = intval($ticket_id);

    $open_tickets_file = get_open_tickets_file();
    $closed_tickets_file = get_closed_tickets_file();

    if (!file_exists($open_tickets_file) || !file_exists($closed_tickets_file)) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'File dei ticket non trovati.']);
        return;
    }

    $open_tickets = json_decode(file_get_contents($open_tickets_file), true);
    $closed_tickets = json_decode(file_get_contents($closed_tickets_file), true);

    $ticket_to_move = null;
    $ticket_index = -1;

    foreach ($open_tickets as $index => $ticket) {
        if (isset($ticket['id']) && $ticket['id'] === $ticket_id_to_find) {
            $ticket_to_move = $ticket;
            $ticket_index = $index;
            break;
        }
    }

    if ($ticket_to_move) {
        // Remove from open tickets
        array_splice($open_tickets, $ticket_index, 1);
        // Add to closed tickets
        $closed_tickets[] = $ticket_to_move;

        file_put_contents($open_tickets_file, json_encode($open_tickets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        file_put_contents($closed_tickets_file, json_encode($closed_tickets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        echo json_encode(['status' => 'success', 'message' => 'Ticket completato.']);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Ticket non trovato tra quelli aperti.']);
    }
}

// --- NATION FUNCTIONS ---
function get_nations() {
    $nations_file = get_nations_file();
    if (!file_exists($nations_file)) {
        file_put_contents($nations_file, '[]');
    }
    header('Content-Type: application/json');
    echo file_get_contents($nations_file);
}

function add_nation() {
    if (!is_admin()) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Accesso negato.']);
        return;
    }

    $name = $_POST['name'] ?? '';
    if (empty($name)) {
        echo json_encode(['status' => 'error', 'message' => 'Il nome della nazione è obbligatorio.']);
        return;
    }

    $nations_file = get_nations_file();
    $nations = json_decode(file_get_contents($nations_file), true);

    foreach ($nations as $nation) {
        if (strcasecmp($nation['name'], $name) == 0) {
            echo json_encode(['status' => 'error', 'message' => 'Una nazione con questo nome esiste già.']);
            return;
        }
    }

    $nations[] = ['name' => $name];
    file_put_contents($nations_file, json_encode($nations, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success']);
}

function delete_nation() {
    if (!is_admin()) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Accesso negato.']);
        return;
    }

    $name = $_POST['name'] ?? '';
    if (empty($name)) {
        echo json_encode(['status' => 'error', 'message' => 'Il nome della nazione è obbligatorio.']);
        return;
    }

    $nations_file = get_nations_file();
    $nations = json_decode(file_get_contents($nations_file), true);

    $nations = array_filter($nations, function($nation) use ($name) {
        return strcasecmp($nation['name'], $name) != 0;
    });

    file_put_contents($nations_file, json_encode(array_values($nations), JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success']);
}

function update_nation_details() {
    if (!is_admin()) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Accesso negato.']);
        return;
    }

    $name = $_POST['name'] ?? '';
    if (empty($name)) {
        echo json_encode(['status' => 'error', 'message' => 'Il nome della nazione è obbligatorio.']);
        return;
    }

    $nations_file = get_nations_file();
    $nations = json_decode(file_get_contents($nations_file), true);

    $nation_index = -1;
    foreach ($nations as $index => $nation) {
        if (strcasecmp($nation['name'], $name) == 0) {
            $nation_index = $index;
            break;
        }
    }

    if ($nation_index === -1) {
        echo json_encode(['status' => 'error', 'message' => 'Nazione non trovata.']);
        return;
    }

    $nations[$nation_index]['description'] = $_POST['description'] ?? '';

    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $nations_img_dir = __DIR__ . '/../data/nations/';
        if (!is_dir($nations_img_dir)) {
            mkdir($nations_img_dir, 0777, true);
        }

        // Delete old image if it exists
        if (!empty($nations[$nation_index]['image'])) {
            $old_image_path = __DIR__ . '/../data/' . $nations[$nation_index]['image'];
            if (file_exists($old_image_path)) {
                unlink($old_image_path);
            }
        }

        $file_ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $safe_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($name));
        $file_name = $safe_name . '.' . $file_ext;
        $target_file = $nations_img_dir . $file_name;

        if (move_uploaded_file($_FILES['image']['tmp_name'], $target_file)) {
            $nations[$nation_index]['image'] = 'nations/' . $file_name;
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Errore durante il caricamento dell\'immagine.']);
            return;
        }
    }

    file_put_contents($nations_file, json_encode($nations, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'success']);
}

function organize_splasharts() {
    if (!is_admin()) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Accesso negato.']);
        return;
    }

    $base_data_dir = __DIR__ . '/../data/';
    $splashart_main_dir = $base_data_dir . 'splashart/';
    $uploads_dir = __DIR__ . '/../uploads/';

    $report = ['library_files_moved' => 0, 'user_files_moved' => 0, 'library_paths_updated' => 0, 'user_chars_updated' => 0, 'errors' => []];

    try {
        if (!is_dir($splashart_main_dir)) {
            if (!mkdir($splashart_main_dir, 0777, true)) throw new Exception('Impossibile creare la cartella principale splashart.');
        }

        // 1. Move library splasharts (webp files directly in /data/)
        $library_splasharts = glob($base_data_dir . '*.webp');
        foreach ($library_splasharts as $file_path) {
            $filename = basename($file_path);
            if (rename($file_path, $splashart_main_dir . $filename)) {
                $report['library_files_moved']++;
            }
        }

        // 2. Update characters_list.json
        $library_file = $base_data_dir . 'characters_list.json';
        if (file_exists($library_file)) {
            $library = json_decode(file_get_contents($library_file), true);
            foreach ($library as &$char) {
                if (isset($char['immagine']) && strpos($char['immagine'], '/') === false) { // Only update root-level images
                    $char['immagine'] = 'splashart/' . $char['immagine'];
                    $report['library_paths_updated']++;
                }
            }
            file_put_contents($library_file, json_encode($library, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        // 3. Process all user files
        $users_dir = $base_data_dir . 'users/';
        if (is_dir($users_dir)) {
            $user_folders = glob($users_dir . '*', GLOB_ONLYDIR);
            foreach ($user_folders as $user_folder) {
                $user_id = basename($user_folder);
                $user_splash_dir = $splashart_main_dir . 'splashart_' . $user_id . '/';

                $char_files = glob($user_folder . '/*.json');
                foreach ($char_files as $char_file) {
                    $char_data = json_decode(file_get_contents($char_file), true);
                    if (!isset($char_data['profile']['splashart']) || empty($char_data['profile']['splashart'])) continue;

                    $old_path = $char_data['profile']['splashart'];

                    if (strpos($old_path, 'uploads/') === 0) { // This is a custom user splashart
                        if (!is_dir($user_splash_dir)) {
                            if (!mkdir($user_splash_dir, 0777, true)) continue; // Cannot create user dir, skip
                        }
                        $filename = basename($old_path);
                        $source_file = __DIR__ . '/../' . $old_path;
                        if (file_exists($source_file)) {
                            if (rename($source_file, $user_splash_dir . $filename)) {
                                $report['user_files_moved']++;
                            }
                        }
                        $char_data['profile']['splashart'] = 'data/splashart/splashart_' . $user_id . '/' . $filename;
                        $report['user_chars_updated']++;
                    } elseif (strpos($old_path, 'data/') === 0) { // This is a default/library splashart
                        $filename = basename($old_path);
                        $char_data['profile']['splashart'] = 'data/splashart/' . $filename;
                        $report['user_chars_updated']++;
                    }
                    file_put_contents($char_file, json_encode($char_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                }
            }
        }

        $message = "Operazione completata. File libreria spostati: {$report['library_files_moved']}. File utente spostati: {$report['user_files_moved']}. Personaggi libreria aggiornati: {$report['library_paths_updated']}. Personaggi utente aggiornati: {$report['user_chars_updated']}.";
        echo json_encode(['status' => 'success', 'message' => $message]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// --- ROUTER ---
$action = '';
if (isset($_REQUEST['action'])) {
    $action = $_REQUEST['action'];
} else {
    $json_data = json_decode(file_get_contents('php://input'), true);
    if (isset($json_data['action'])) {
        $action = $json_data['action'];
    }
}



$public_actions = ['login', 'logout', 'check_session', 'get_elements', 'get_settings', 'get_nations', 'get_weapons'];
$user_actions   = ['get_all_characters', 'save_character', 'update_character', 'save_build', 'update_build', 'delete_build', 'update_user', 'delete_character', 'get_backgrounds', 'submit_ticket'];
$admin_actions  = ['get_all_users', 'delete_users', 'register', 'add_character_to_library', 'update_library_character', 'upload_background', 'delete_background', 'get_user_schema', 'save_user_schema', 'enforce_user_schema', 'add_element', 'update_element_icon', 'upload_favicon', 'upload_grimoire_background', 'get_character_schema', 'save_character_schema', 'update_character_description', 'sync_library_images', 'get_keyword_settings', 'save_keyword_settings', 'get_tickets', 'close_ticket', 'add_nation', 'delete_nation', 'update_nation_details', 'add_weapon', 'update_weapon_icon', 'organize_splasharts'];
$moderator_allowed_actions = [
    'upload_background',
    'upload_grimoire_background',
    'get_keyword_settings',
    'save_keyword_settings',
    'get_all_users',
    'register',
    'update_character_description'
];

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
    if (is_admin() || (is_moderator() && in_array($action, $moderator_allowed_actions))) {
        $action();
    } else { 
        http_response_code(403); 
        echo json_encode(['status'=>'error','message'=>'Accesso negato.']); 
        exit; 
    }
} else {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'Azione non valida.']);
}