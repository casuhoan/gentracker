document.addEventListener('DOMContentLoaded', () => {
    const API_ENDPOINT = 'php/api.php';

    // --- DOM Elements ---
    const userTableBody = document.querySelector('#user-table-body');
    const searchInput = document.getElementById('user-search');
    const selectAllCheckbox = document.getElementById('select-all-users');
    const deleteSelectedBtn = document.getElementById('delete-selected-users');
    const addUserBtn = document.getElementById('add-user-btn');

    // Edit Modal Elements
    const editUserModalEl = document.getElementById('edit-user-modal');
    const editUserForm = document.getElementById('edit-user-form');
    const editAvatarInput = document.getElementById('edit-avatar');
    const currentAvatarPreview = document.getElementById('current-avatar-preview');
    const editUserModal = editUserModalEl ? new bootstrap.Modal(editUserModalEl) : null;

    // Add Modal Elements
    const addUserModalEl = document.getElementById('add-user-modal');
    const addUserForm = document.getElementById('add-user-form');
    const addAvatarInput = document.getElementById('add-avatar');
    const addAvatarPreview = document.getElementById('add-avatar-preview');
    const addUserModal = addUserModalEl ? new bootstrap.Modal(addUserModalEl) : null;

    let users = [];

    // --- Utility Functions ---
    const showToast = (title, icon = 'success') => {
        Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 3000 });
    };

    const showErrorAlert = (message) => {
        Swal.fire({ icon: 'error', title: 'Oops...', text: message });
    };

    // --- API Communication ---
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_ENDPOINT}?action=get_all_users`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            users = await response.json();
            renderUsers(users);
        } catch (error) {
            console.error('Fetch users error:', error);
            showErrorAlert('Impossibile caricare la lista degli utenti.');
        }
    };

    const handleApiRequest = async (action, formData, successMessage) => {
        try {
            formData.append('action', action);
            const response = await fetch(API_ENDPOINT, { method: 'POST', body: formData });
            const result = await response.json();

            if (result.status === 'success') {
                showToast(successMessage || result.message);
                fetchUsers(); // Refresh the user list
                return true;
            } else {
                showErrorAlert(result.message);
                return false;
            }
        } catch (error) {
            console.error(`API request error for action ${action}:`, error);
            showErrorAlert('Errore di comunicazione con il server.');
            return false;
        }
    };

    // --- Rendering ---
    const renderUsers = (list) => {
        if (!userTableBody) return;
        userTableBody.innerHTML = list.length === 0
            ? '<tr><td colspan="4" class="text-center">Nessun utente trovato.</td></tr>'
            : list.map(user => {
                const isCurrentUser = window.currentUser && window.currentUser.username === user.username;
                const isTargetAdmin = user.role === 'admin';

                let actionsHtml = '';
                // Edit button logic
                let canEdit = (window.isAdmin || window.isModerator) && !isCurrentUser;
                if (window.isModerator && isTargetAdmin) {
                    canEdit = false; // Moderators cannot edit admins
                }
                if (canEdit) {
                    actionsHtml += `<button class="btn btn-sm btn-primary btn-edit-user" data-username="${user.username}">Modifica</button>`;
                }

                // Delete button logic (only for admins)
                if (window.isAdmin && !isTargetAdmin && !isCurrentUser) {
                    actionsHtml += ` <button class="btn btn-sm btn-danger btn-delete-user" data-username="${user.username}">Elimina</button>`;
                }

                // Checkbox logic
                const canSelect = window.isAdmin && !isTargetAdmin && !isCurrentUser;

                return `
                <tr>
                    <td><input type="checkbox" class="user-checkbox" data-username="${user.username}" ${!canSelect ? 'disabled' : ''}></td>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td class="text-end">
                        ${actionsHtml}
                    </td>
                </tr>
            `}).join('');
    };

    // --- Event Handlers ---
    const handleSearch = () => {
        const term = searchInput.value.toLowerCase();
        renderUsers(users.filter(u => u.username.toLowerCase().includes(term)));
    };

    const handleSelectAll = (e) => {
        document.querySelectorAll('.user-checkbox:not([disabled])').forEach(cb => cb.checked = e.target.checked);
    };

    const handleDeleteSelected = () => {
        const selectedUsernames = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.dataset.username);
        if (selectedUsernames.length === 0) return;

        Swal.fire({
            title: `Sei sicuro di eliminare ${selectedUsernames.length} utente/i?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sì, elimina!',
            cancelButtonText: 'Annulla'
        }).then(async (result) => {
            if (!result.isConfirmed) return;

            let successCount = 0;
            for (const username of selectedUsernames) {
                const formData = new FormData();
                formData.append('username', username);
                if (await handleApiRequest('delete_users', formData)) {
                    successCount++;
                }
            }

            if (successCount > 0) {
                showToast(`${successCount} utente/i eliminato/i con successo.`);
            }
            if (successCount < selectedUsernames.length) {
                showErrorAlert('Alcuni utenti non sono stati eliminati.');
            }
        });
    };

    const openEditModal = (username) => {
        const user = users.find(u => u.username === username);
        if (!user || !editUserForm) return;

        editUserForm.reset();
        editUserForm.querySelector('#original-username').value = user.username;
        editUserForm.querySelector('#edit-username').value = user.username;
        
        const roleSelect = editUserForm.querySelector('#edit-role');
        roleSelect.value = user.role;

        // Restrict role options for moderators
        if (window.isModerator) {
            Array.from(roleSelect.options).forEach(option => {
                if (option.value === 'admin') {
                    option.disabled = true;
                }
            });
        } else if (window.isAdmin) {
            Array.from(roleSelect.options).forEach(option => {
                option.disabled = false;
            });
        }

        if (currentAvatarPreview) {
            currentAvatarPreview.src = user.avatar ? user.avatar : '';
            currentAvatarPreview.style.display = user.avatar ? 'block' : 'none';
        }

        editUserModal?.show();
    };

    const openAddModal = () => {
        if (!addUserForm) return;
        addUserForm.reset();

        const roleSelect = addUserForm.querySelector('#add-role');
        
        // Restrict role options for moderators
        if (window.isModerator) {
            roleSelect.value = 'user';
            Array.from(roleSelect.options).forEach(option => {
                if (option.value === 'admin' || option.value === 'moderator') {
                    option.disabled = true;
                }
            });
        } else if (window.isAdmin) {
            roleSelect.value = 'user';
             Array.from(roleSelect.options).forEach(option => {
                option.disabled = false;
            });
        }

        if (addAvatarPreview) {
            addAvatarPreview.src = '';
            addAvatarPreview.style.display = 'none';
        }
        addUserModal?.show();
    };

    const setupAvatarPreview = (input, preview) => {
        if (!input || !preview) return;
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.src = '';
                preview.style.display = 'none';
            }
        });
    };

    // --- Initialization ---
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', handleSelectAll);
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    if (addUserBtn) addUserBtn.addEventListener('click', openAddModal);

    if (userTableBody) {
        userTableBody.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('btn-edit-user')) {
                openEditModal(target.dataset.username);
            }
            if (target.classList.contains('btn-delete-user')) {
                handleDeleteSelected(); // Can reuse the same logic for single delete
            }
        });
    }

    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (await handleApiRequest('update_user', new FormData(editUserForm), 'Utente aggiornato!')) {
                editUserModal?.hide();
            }
        });
    }

    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (await handleApiRequest('register', new FormData(addUserForm), 'Utente aggiunto!')) {
                addUserModal?.hide();
            }
        });
    }

    setupAvatarPreview(editAvatarInput, currentAvatarPreview);
    setupAvatarPreview(addAvatarInput, addAvatarPreview);

    // Expose loadUsers to be called from app.js
    window.loadUsers = fetchUsers;
});