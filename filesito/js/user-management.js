let users = []; // Global or accessible scope

// Define loadUsers globally
async function loadUsers() {
    try {
        const response = await fetch('php/api.php?action=get_all_users');
        users = await response.json();
        renderUsers(users);
    } catch (error) {
        console.error(error);
        Swal.fire('Errore', 'Impossibile caricare gli utenti', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const userTableBody = document.querySelector('#user-table-body');
    const searchInput = document.getElementById('user-search');
    const selectAllCheckbox = document.getElementById('select-all-users');
    const deleteSelectedBtn = document.getElementById('delete-selected-users');
    const editUserModal = document.getElementById('edit-user-modal');
    const editUserForm = document.getElementById('edit-user-form');
    const addUserBtn = document.getElementById('add-user-btn'); // Assuming this exists

    // New DOM elements for avatar
    const editAvatarInput = document.getElementById('edit-avatar');
    const currentAvatarPreview = document.getElementById('current-avatar-preview');

    // New DOM elements for Add User Modal
    const addUserModal = document.getElementById('add-user-modal');
    const addUserForm = document.getElementById('add-user-form');
    const addUsernameInput = document.getElementById('add-username');
    const addPasswordInput = document.getElementById('add-password');
    const addRoleSelect = document.getElementById('add-role');
    const addAvatarInput = document.getElementById('add-avatar');
    const addAvatarPreview = document.getElementById('add-avatar-preview');


    const renderUsers = (list) => {
        if (!userTableBody) return; // Safety check
        userTableBody.innerHTML = '';
        if (list.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nessun utente trovato.</td></tr>';
            return;
        }
        list.forEach(user => {
            userTableBody.innerHTML += `
                <tr>
                    <td><input type="checkbox" class="user-checkbox" data-username="${user.username}"></td>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-primary btn-edit-user" data-username="${user.username}">Modifica</button>
                        <button class="btn btn-sm btn-danger btn-delete-single-user" data-username="${user.username}">Elimina</button>
                    </td>
                </tr>
            `;
        });
    };

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();
            renderUsers(users.filter(u => u.username.toLowerCase().includes(term)));
        });
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = selectAllCheckbox.checked);
        });
    }

    if (userTableBody) {
        userTableBody.addEventListener('click', async (e) => { // Made async to handle delete
            if (e.target.classList.contains('btn-edit-user')) {
                const username = e.target.dataset.username;
                const user = users.find(u => u.username === username);
                if (!user) return;

                document.getElementById('original-username').value = user.username;
                document.getElementById('edit-username').value = user.username;
                document.getElementById('edit-role').value = user.role;
                document.getElementById('edit-password').value = '';
                // document.getElementById('edit-avatar').value = ''; // Clear file input

                // Set avatar preview
                if (user.avatar) {
                    currentAvatarPreview.src = user.avatar;
                    currentAvatarPreview.style.display = 'block';
                } else {
                    currentAvatarPreview.src = '';
                    currentAvatarPreview.style.display = 'none';
                }

                const modal = new bootstrap.Modal(editUserModal);
                modal.show();
            } else if (e.target.classList.contains('btn-delete-single-user')) { // Added for single delete
                const usernameToDelete = e.target.dataset.username;
                Swal.fire({
                    title: `Sei sicuro di eliminare l'utente ${usernameToDelete}?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sì, elimina!',
                    cancelButtonText: 'Annulla'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const formData = new FormData();
                            formData.append('action', 'delete_users');
                            formData.append('username', usernameToDelete);

                            const response = await fetch('php/api.php', { method: 'POST', body: formData });
                            const result = await response.json();
                            if (result.status === 'success') {
                                Swal.fire('Fatto', result.message, 'success');
                                loadUsers(); // Reload users after deletion
                            } else {
                                Swal.fire('Errore', result.message, 'error');
                            }
                        } catch (error) {
                            console.error(error);
                            Swal.fire('Errore', 'Impossibile comunicare con il server', 'error');
                        }
                    }
                });
            }
        });
    }

    // Avatar preview on file selection
    if (editAvatarInput) {
        editAvatarInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentAvatarPreview.src = e.target.result;
                    currentAvatarPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                currentAvatarPreview.src = '';
                currentAvatarPreview.style.display = 'none';
            }
        });
    }

    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(editUserForm);
            formData.append('action', 'update_user');

            try {
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status === 'success') {
                    Swal.fire('Fatto', result.message, 'success');
                    loadUsers(); // Reload users after update
                    bootstrap.Modal.getInstance(editUserModal).hide();
                } else {
                    Swal.fire('Errore', result.message, 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Errore', 'Impossibile comunicare con il server', 'error');
            }
        });
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', () => {
            const selected = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.dataset.username);
            if (selected.length === 0) return;

            Swal.fire({
                title: `Sei sicuro di eliminare ${selected.length} utente/i?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sì, elimina!',
                cancelButtonText: 'Annulla'
            }).then(async (result) => {
                if (!result.isConfirmed) return;
                try {
                    let allSuccess = true;
                    for (const username of selected) {
                        const formData = new FormData();
                        formData.append('action', 'delete_users');
                        formData.append('username', username); // Send single username

                        const response = await fetch('php/api.php', { method: 'POST', body: formData });
                        const result = await response.json();
                        if (result.status !== 'success') {
                            allSuccess = false;
                            showErrorAlert(`Errore durante l'eliminazione di ${username}: ${result.message}`);
                        }
                    }

                    if (allSuccess) {
                        Swal.fire('Fatto', 'Utenti eliminati con successo.', 'success');
                        loadUsers(); // Reload users after all deletions
                    } else {
                        Swal.fire('Attenzione', 'Alcuni utenti non sono stati eliminati.', 'warning');
                    }
                } catch (error) {
                    console.error(error);
                    Swal.fire('Errore', 'Impossibile comunicare con il server', 'error');
                }
            });
        });
    }

    // Add User functionality
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            addUserForm.reset(); // Clear form fields
            addAvatarPreview.src = '';
            addAvatarPreview.style.display = 'none';
            const modal = new bootstrap.Modal(addUserModal);
            modal.show();
        });
    }

    // Avatar preview on file selection for Add User
    if (addAvatarInput) {
        addAvatarInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    addAvatarPreview.src = e.target.result;
                    addAvatarPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                addAvatarPreview.src = '';
                addAvatarPreview.style.display = 'none';
            }
        });
    }

    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addUserForm);
            formData.append('action', 'register'); // Use the register action

            try {
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status === 'success') {
                    Swal.fire('Fatto', result.message, 'success');
                    loadUsers(); // Reload users after adding new user
                    bootstrap.Modal.getInstance(addUserModal).hide();
                } else {
                    Swal.fire('Errore', result.message, 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Errore', 'Impossibile comunicare con il server', 'error');
            }
        });
    }
});

// Helper function for rendering users (can be global or passed)
function renderUsers(list) {
    const userTableBody = document.querySelector('#user-table-body');
    if (!userTableBody) return; // Safety check
    userTableBody.innerHTML = '';
    if (list.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nessun utente trovato.</td></tr>';
        return;
    }
    list.forEach(user => {
        userTableBody.innerHTML += `
            <tr>
                <td><input type="checkbox" class="user-checkbox" data-username="${user.username}"></td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-primary btn-edit-user" data-username="${user.username}">Modifica</button>
                    <button class="btn btn-sm btn-danger btn-delete-single-user" data-username="${user.username}">Elimina</button>
                </td>
            </tr>
        `;
    });
}