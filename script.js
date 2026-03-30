

// #region 🔒 FIREBASE & IMAGE UPLOAD
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref as dbRef, push, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// Your web app's Firebase configuration (using config from structure.html)
const firebaseConfig = {
    apiKey: "AIzaSyCIfleywEbd1rcjymkfEfFYxPpvYdZHGhk",
    authDomain: "cvang-vahan.firebaseapp.com",
    databaseURL: "https://cvang-vahan-default-rtdb.firebaseio.com",
    projectId: "cvang-vahan",
    storageBucket: "cvang-vahan.appspot.com",
    messagingSenderId: "117318825099",
    appId: "1:117318825099:web:afc0e2f863117cb14bfc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const imagesRef = dbRef(db, 'images');

// Cloudinary configuration (from structure.html)
const cloudName = 'dhxfz7npl'; // Replace with your Cloudinary cloud name
const uploadPreset = 'anonymous_upload'; // Replace with your Cloudinary upload preset
// ✅ Handle paste event for images
document.addEventListener("paste", function (event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf("image") === 0) {
            const file = item.getAsFile();
            if (file) {
                const tagInput = document.getElementById("tagInput");
                const tag = tagInput.value.trim() || "ClipboardImage";
                const progressBar = document.getElementById("progress");
                const statusText = document.getElementById("status");
                uploadFile(file, tag, progressBar, statusText);
            }
        }
    }
});


// Global variables
let selectedFile = null;
let selectedFiles = [];
let pendingFiles = []; // Files queued for upload with preview
let hasCalculated = false;

// Toggle password visibility
window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁';
    }
};

// Expose functions to window object

// ✅ File Preview Logic - renders thumbnails with delete option
function renderFilePreview() {
    const container = document.getElementById('filePreviewContainer');
    container.innerHTML = '';

    if (pendingFiles.length === 0) {
        return;
    }

    pendingFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-preview-item';

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-preview-remove';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Remove this file';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            pendingFiles.splice(index, 1);
            renderFilePreview();
            // Agar sab files remove ho gayi to file input bhi reset karo
            if (pendingFiles.length === 0) {
                document.getElementById('fileUpload').value = '';
            }
        };

        const nameLabel = document.createElement('div');
        nameLabel.className = 'file-preview-name';
        nameLabel.textContent = file.name;

        item.appendChild(img);
        item.appendChild(removeBtn);
        item.appendChild(nameLabel);
        container.appendChild(item);
    });
}

// ✅ Listen for file input changes to show preview
document.getElementById('fileUpload').addEventListener('change', function () {
    pendingFiles = Array.from(this.files);
    renderFilePreview();
});

// Multiple Image Upload Function
window.uploadImage = function () {
    const uploadBtn = document.querySelector(".colorful-upload-btn");

    const tagInput = document.getElementById("tagInput");
    const tag = tagInput.value.trim();
    const password = document.getElementById("passwordInput").value.trim();
    const progressBar = document.getElementById("progress");
    const statusText = document.getElementById("status");

    // Use pendingFiles instead of fileInput.files
    if (!pendingFiles.length) {
        showMessage("Please select at least one file!", "error");
        return;
    }

    uploadBtn.style.display = "none"; // Upload button ko hide kar do

    if (!tag) {
        // Agar tag blank hai to modal open karo
        selectedFiles = [...pendingFiles];
        document.getElementById("tagModal").style.display = "flex";
        return;
    }

    // Reset progress bar to 0%
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    statusText.textContent = 'Ready';

    // ✅ Loop through all pending files
    let completedCount = 0;
    const totalFiles = pendingFiles.length;

    pendingFiles.forEach((file) => {
        uploadFile(file, tag, password, progressBar, statusText, null, () => {
            completedCount++;
            if (completedCount >= totalFiles) {
                // Sab files complete hone par button wapas dikhao
                uploadBtn.style.display = "inline-block";
                showMessage(`${totalFiles} image(s) uploaded successfully!`, 'info');
                document.getElementById('passwordInput').value = ''; // Clear password
            }
        });
    });

    // Clear preview and reset
    pendingFiles = [];
    renderFilePreview();
    document.getElementById('fileUpload').value = '';
};


window.closeModal = function () {
    document.getElementById('tagModal').style.display = 'none';
    document.getElementById('modalTagInput').value = '';
    document.getElementById('modalTagInput').style.display = 'inline-block'; // Re-show input field
    document.getElementById('modalPasswordInput').value = ''; // Clear modal password
    const pwWrapper = document.querySelector('#tagModal .password-field-wrapper');
    if (pwWrapper) pwWrapper.style.display = 'inline-flex'; // Re-show password field
    document.getElementById('modalProgressContainer').style.display = 'none';
    document.getElementById('modalProgress').style.width = '0%';
    document.getElementById('modalProgress').textContent = '0%';
    // Reset modal heading back to default
    const modalHeading = document.getElementById('modalHeading');
    if (modalHeading) modalHeading.textContent = '⚠️ Tag is required!';
    const modalStatus = document.getElementById('modalStatus');
    if (modalStatus) modalStatus.textContent = 'Uploading...';
    document.querySelector('.modal-content .upload-btn').style.display = 'inline-block'; // Show buttons again
    document.querySelector('.modal-content .cancel-btn').style.display = 'inline-block'; // Show buttons again
    // Re-show the main upload button that was hidden
    const uploadBtn = document.querySelector(".colorful-upload-btn");
    if (uploadBtn) uploadBtn.style.display = "inline-block";
    // Reset main progress bar
    document.getElementById('progress').style.width = '0%';
    document.getElementById('progress').textContent = '0%';
    document.getElementById('status').textContent = 'Ready';
    selectedFile = null; // Clear selected file
    selectedFiles = []; // Clear selected files
    pendingFiles = []; // Clear pending files
    renderFilePreview(); // Clear file preview
    document.getElementById('fileUpload').value = ''; // Reset file input
};

window.submitTag = function () {
    const modalTagInput = document.getElementById('modalTagInput');
    const tag = modalTagInput.value.trim();
    const password = document.getElementById('modalPasswordInput').value.trim();
    const progressBar = document.getElementById('progress');
    const statusText = document.getElementById('status');
    const modalProgress = document.getElementById('modalProgress');
    const modalProgressContainer = document.getElementById('modalProgressContainer');

    if (!tag) {
        showMessage("Tag is required!", "error");
        return;
    }

    // Reset progress bars
    modalProgress.style.width = '0%';
    modalProgress.textContent = '0%';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    statusText.textContent = 'Uploading...';

    // Change modal heading to uploading state
    const modalHeading = document.getElementById('modalHeading');
    if (modalHeading) modalHeading.textContent = '📤 Uploading...';
    const modalStatus = document.getElementById('modalStatus');
    if (modalStatus) modalStatus.textContent = 'Starting upload...';

    modalProgressContainer.style.display = 'block';
    document.querySelector('.modal-content .upload-btn').style.display = 'none';
    document.querySelector('.modal-content .cancel-btn').style.display = 'none';
    // Input fields bhi hide karo uploading ke dauran
    modalTagInput.style.display = 'none';
    document.querySelector('#tagModal .password-field-wrapper').style.display = 'none';

    // ✅ Multiple files handle
    const filesToUpload = selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : []);
    
    if (filesToUpload.length === 0) {
        showMessage("No files to upload!", "error");
        return;
    }

    let completedCount = 0;
    const totalFiles = filesToUpload.length;

    filesToUpload.forEach((file) => {
        uploadFile(file, tag, password, progressBar, statusText, modalProgress, () => {
            completedCount++;
            if (completedCount >= totalFiles) {
                // Sab files upload ho gayi — ab modal band karo
                setTimeout(() => {
                    closeModal();
                    showMessage(`${totalFiles} image(s) uploaded successfully!`, 'info');
                }, 800);
            }
        });
    });

    selectedFiles = [];
    selectedFile = null;
};

function uploadFile(file, tag, password, progressBar, statusText, modalProgress, onComplete) {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('tags', tag);

    // Reset progress before starting
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    statusText.textContent = 'Uploading...';
    if (modalProgress) {
        modalProgress.style.width = '0%';
        modalProgress.textContent = '0%';
    }

    const xhr = new XMLHttpRequest();

    // Progress bar update for each file
    xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percentComplete + '%';
            progressBar.textContent = percentComplete + '%';
            statusText.textContent = `Uploading... ${percentComplete}%`;
            // Modal progress bar bhi update karo agar open hai
            if (modalProgress) {
                modalProgress.style.width = percentComplete + '%';
                modalProgress.textContent = percentComplete + '%';
            }
            // Modal status text update
            const modalStatus = document.getElementById('modalStatus');
            if (modalStatus) modalStatus.textContent = `Uploading... ${percentComplete}%`;
        }
    };

    // Upload complete
    xhr.onload = function () {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (!data.secure_url) {
                showMessage('Upload failed: No secure URL received', 'error');
                statusText.textContent = 'Upload failed!';
                if (onComplete) onComplete();
                return;
            }

            const imgObj = {
                url: data.secure_url,
                tag: tag,
                name: file.name,
                timestamp: Date.now()
            };
            // Agar password set kiya hai to save karo
            if (password) {
                imgObj.password = password;
            }

            // Save into Firebase
            push(imagesRef, imgObj)
                .then(() => {
                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';
                    statusText.textContent = '✅ Complete';
                    if (modalProgress) {
                        modalProgress.style.width = '100%';
                        modalProgress.textContent = '100%';
                    }
                    document.getElementById('fileUpload').value = '';
                    document.getElementById('tagInput').value = '';
                    loadImages();
                    if (onComplete) onComplete();
                })
                .catch((error) => {
                    console.error("Firebase Push Error:", error);
                    statusText.textContent = 'Upload failed: Firebase error';
                    showMessage('Upload failed: Firebase error', 'error');
                    if (onComplete) onComplete();
                });
        } else {
            console.error("Cloudinary Upload Failed:", xhr.status, xhr.responseText);
            statusText.textContent = 'Upload failed!';
            showMessage('Upload failed!', 'error');
            if (onComplete) onComplete();
        }
    };

    xhr.onerror = function () {
        console.error("Upload error occurred:", xhr.status);
        statusText.textContent = 'Upload error!';
        showMessage('Upload failed due to network error!', 'error');
        if (onComplete) onComplete();
    };

    xhr.open('POST', url, true);
    xhr.send(formData);
}

// Custom message box function (instead of alert)
function showMessage(message, type = "info") {
    const messageBox = document.createElement("div");
    messageBox.style.position = "fixed";
    messageBox.style.top = "20px";
    messageBox.style.left = "50%";
    messageBox.style.transform = "translateX(-50%)";
    messageBox.style.padding = "15px 25px";
    messageBox.style.borderRadius = "10px";
    messageBox.style.zIndex = "9999";
    messageBox.style.color = "white";
    messageBox.style.fontWeight = "bold";
    messageBox.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    messageBox.style.transition = "opacity 0.5s ease-in-out";
    messageBox.style.opacity = "1";

    if (type === "error") {
        messageBox.style.backgroundColor = "#f44336"; /* Red */
    } else {
        messageBox.style.backgroundColor = "#4CAF50"; /* Green */
    }

    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    setTimeout(() => {
        messageBox.style.opacity = "0";
        messageBox.addEventListener("transitionend", () => messageBox.remove());
    }, 3000);
}

// Function to handle direct image download
window.downloadImageDirectly = async function (imageUrl, fileName) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showMessage('Download initiated!', 'info');
    } catch (error) {
        console.error("Error downloading image:", error);
        showMessage('Failed to download image.', 'error');
    }
};


function loadImages() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    // Clear the gallery first to avoid duplicates when data updates
    // The onValue listener will handle re-rendering on changes
    onValue(imagesRef, (snapshot) => {
        gallery.innerHTML = ''; // Clear content every time data changes
        const images = snapshot.val();
        const now = Date.now();

        if (images) {
            const sortedImages = Object.entries(images)
                .map(([key, img]) => ({ key, ...img }))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Sort by timestamp descending

            sortedImages.forEach(({ key, url, tag, timestamp, name, password: imgPassword }) => {
                // Check if the image is older than 5 minutes (300,000 milliseconds)
                // If it is, delete it from the database (cleanup logic)
                if (now - (timestamp || 0) > 300000) {
                    remove(dbRef(db, `images/${key}`))
                        .then(() => console.log(`Image ${key} deleted (older than 5 min)`))
                        .catch((error) => console.error("Auto-delete error:", error));
                } else {
                    const isLocked = !!imgPassword;
                    const container = document.createElement('div');
                    container.className = 'image-container' + (isLocked ? ' image-locked' : '');

                    const imgElement = document.createElement('img');
                    imgElement.src = url;
                    imgElement.alt = tag || 'Uploaded image';
                    imgElement.loading = 'lazy';
                    imgElement.onerror = () => {
                        imgElement.src = `https://placehold.co/150x150/cccccc/333333?text=Image+Error`;
                        console.warn(`Failed to load image: ${url}`);
                    };

                    // Lock overlay for password protected images
                    if (isLocked) {
                        const lockOverlay = document.createElement('div');
                        lockOverlay.className = 'lock-overlay';
                        lockOverlay.innerHTML = '<span class="lock-icon">🔒</span><span class="lock-text">Tap to unlock</span>';
                        container.appendChild(lockOverlay);
                    }

                    const tagElement = document.createElement('p');
                    tagElement.className = 'tag';
                    tagElement.textContent = `Tag: ${tag || 'No tag'}` + (isLocked ? ' 🔒' : '');

                    // ✅ Shared unlock function — kahi se bhi call karo
                    const unlockImage = () => {
                        if (!container.classList.contains('image-locked')) return; // Already unlocked
                        const enteredPw = prompt('🔑 Enter password to unlock this image:');
                        if (enteredPw === null) return; // Cancelled
                        if (enteredPw === imgPassword) {
                            container.classList.remove('image-locked');
                            container.classList.add('image-unlocked');
                            container.style.cursor = 'default';
                            const overlay = container.querySelector('.lock-overlay');
                            if (overlay) overlay.remove();
                            tagElement.textContent = `Tag: ${tag || 'No tag'} ✅`;
                            const unlockBtnEl = container.querySelector('.unlock-btn');
                            if (unlockBtnEl) unlockBtnEl.style.display = 'none';
                            showMessage('🔓 Image unlocked!', 'info');
                        } else {
                            showMessage('❌ Wrong password!', 'error');
                        }
                    };

                    // ✅ Poore container par click se unlock (locked images ke liye)
                    if (isLocked) {
                        container.style.cursor = 'pointer';
                        container.onclick = (e) => {
                            // Agar button par click kiya hai to ignore karo (button apna kaam karega)
                            if (e.target.closest('.download-btn') || e.target.closest('.delete-btn') || e.target.closest('.unlock-btn')) {
                                return;
                            }
                            unlockImage();
                        };
                    }

                    // Download Button
                    const downloadBtn = document.createElement('button');
                    downloadBtn.className = 'download-btn';
                    downloadBtn.textContent = '⬇ Download';
                    downloadBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (isLocked && container.classList.contains('image-locked')) {
                            unlockImage();
                            return;
                        }
                        window.downloadImageDirectly(url, name || `image_${key}.jpg`);
                    };

                    // Delete Button
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.textContent = '🗑 Delete';
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        // Agar password protected hai to pehle password maango
                        if (isLocked && imgPassword) {
                            const pw = prompt('🔑 Enter password to delete this image:');
                            if (pw === null) return;
                            if (pw !== imgPassword) {
                                showMessage('❌ Wrong password! Cannot delete.', 'error');
                                return;
                            }
                        }
                        if (confirm('Are you sure you want to delete this image?')) {
                            remove(dbRef(db, `images/${key}`))
                                .then(() => {
                                    showMessage('Image deleted successfully!', 'info');
                                })
                                .catch((error) => {
                                    console.error("Delete error:", error);
                                    showMessage('Failed to delete image.', 'error');
                                });
                        }
                    };

                    // Button group
                    const btnGroup = document.createElement('div');
                    btnGroup.className = 'gallery-btn-group';

                    // Unlock button (only for locked images)
                    if (isLocked) {
                        const unlockBtn = document.createElement('button');
                        unlockBtn.className = 'unlock-btn';
                        unlockBtn.textContent = '🔓 Unlock';
                        unlockBtn.onclick = (e) => {
                            e.stopPropagation();
                            unlockImage();
                        };
                        btnGroup.appendChild(unlockBtn);
                    }

                    btnGroup.appendChild(downloadBtn);
                    btnGroup.appendChild(deleteBtn);

                    container.appendChild(imgElement);
                    container.appendChild(tagElement);
                    container.appendChild(btnGroup);
                    gallery.appendChild(container);
                }
            });
        } else {
            gallery.innerHTML = '<p style="color: #455a64; margin-top: 20px;">No images uploaded yet.</p>';
        }
    });
}

// #endregion

// #region 🔒 CSAT CALCULATOR
// CSAT Calculator Functions
window.openCSATModal = function () {
    document.getElementById('csatModal').style.display = 'flex';
    hideAllMainContent();
    // Ensure all other full-page views are hidden
    const endorsementPage = document.getElementById('endorsementPage');
    if (endorsementPage) endorsementPage.style.display = 'none';
    const manualVIPage = document.getElementById('manualVIPage');
    if (manualVIPage) manualVIPage.style.display = 'none';
    const claimCountNSTPPage = document.getElementById('claimCountNSTPPage');
    if (claimCountNSTPPage) claimCountNSTPPage.style.display = 'none';
    const inspectionWaiverPage = document.getElementById('inspectionWaiverPage');
    if (inspectionWaiverPage) inspectionWaiverPage.style.display = 'none';
    const rsaContactPage = document.getElementById('rsaContactPage');
    if (rsaContactPage) rsaContactPage.style.display = 'none';
    calculateCSAT();
};

window.closeCSATModal = function () {
    document.getElementById('csatModal').style.display = 'none';
    document.getElementById('goodCount').value = '0';
    document.getElementById('badCount').value = '0';
    document.getElementById('requiredCSAT').value = '70';
    document.getElementById('calculateButton').textContent = 'Calculate';
    hasCalculated = false;
    calculateCSAT();
    showAllMainContent();
};

window.calculateCSAT = function () {
    const goodCount = parseInt(document.getElementById('goodCount').value) || 0;
    const badCount = parseInt(document.getElementById('badCount').value) || 0;
    const requiredCSAT = parseInt(document.getElementById('requiredCSAT').value);
    const resultSection = document.getElementById('csatResult');
    const status = document.getElementById('csatStatus');
    const calculateButton = document.getElementById('calculateButton');

    const total = goodCount + badCount;
    const csat = total === 0 ? 0 : (goodCount / total) * 100;
    const formattedCSAT = csat.toFixed(2);

    resultSection.querySelector('p:nth-child(1)').textContent = `Total: ${total}`;
    resultSection.querySelector('p:nth-child(2)').textContent = `CSAT: ${formattedCSAT}%`;

    if (total === 0) {
        status.innerHTML = '<span class="shivang-rainbow">SHIVANG</span>';
        status.className = '';
        return;
    }

    let additionalGoodNeeded = 0;
    let newCSAT = csat;
    let newGoodCount = goodCount;
    let newTotal = total;

    if (csat <= requiredCSAT) {
        while (newCSAT <= requiredCSAT) {
            additionalGoodNeeded++;
            newGoodCount = goodCount + additionalGoodNeeded;
            newTotal = total + additionalGoodNeeded;
            newCSAT = (newGoodCount / newTotal) * 100;
        }
    }

    const exactCSAT = newCSAT;

    const isAboveRequired = csat > requiredCSAT;

    if (isAboveRequired) {
        status.textContent = `Success! CSAT (${formattedCSAT}%) is above required (${requiredCSAT}%+).`;
        status.className = 'success';
    } else {
        status.textContent = `Need ${additionalGoodNeeded} more good count(s) to achieve ${requiredCSAT}%+ (exact: ${exactCSAT.toFixed(2)}%).`;
        status.className = 'error';
    }

    if (!hasCalculated) {
        hasCalculated = true;
        calculateButton.textContent = 'Recalculate';
    }
};

// Close CSAT Modal on Outside Click
document.getElementById('csatModal').addEventListener('click', function (event) {
    if (event.target === this) {
        closeCSATModal();
    }
});

// #endregion

// #region 🔒 ENDORSEMENT PAGE
// ENDORSEMENT Full-Page Functionality
window.openEndorsementPage = function () {
    document.getElementById('endorsementPage').style.display = 'block';
    setTimeout(() => {
        const endorsementContainer = document.querySelector('.endorsement-container');
        if (endorsementContainer) endorsementContainer.classList.add('active');
    }, 10);
    hideAllMainContent();
    // Ensure all other full-page views are hidden
    const csatModal = document.getElementById('csatModal');
    if (csatModal) csatModal.style.display = 'none';
    const manualVIPage = document.getElementById('manualVIPage');
    if (manualVIPage) manualVIPage.style.display = 'none';
    const claimCountNSTPPage = document.getElementById('claimCountNSTPPage');
    if (claimCountNSTPPage) claimCountNSTPPage.style.display = 'none';
    const inspectionWaiverPage = document.getElementById('inspectionWaiverPage');
    if (inspectionWaiverPage) inspectionWaiverPage.style.display = 'none';
    const rsaContactPage = document.getElementById('rsaContactPage');
    if (rsaContactPage) rsaContactPage.style.display = 'none';
};

window.closeEndorsementPage = function () {
    const endorsementPage = document.getElementById('endorsementPage');
    if (endorsementPage) endorsementPage.style.display = 'none';
    const endorsementContainer = document.querySelector('.endorsement-container');
    if (endorsementContainer) endorsementContainer.classList.remove('active');
    showAllMainContent();
};

// Close ENDORSEMENT Page on Outside Click
document.getElementById('endorsementPage').addEventListener('click', function (event) {
    if (event.target === this) {
        closeEndorsementPage();
    }
});

// #endregion

// #region 🔒 MANUAL-VI & CLAIM COVERAGE
// MANUAL-VI Full-Page Functionality
window.openManualVIPage = function () {
    document.getElementById('manualVIPage').style.display = 'block';
    // Ensure the manual VI card content is visible by default when opening this page
    const manualVICardContent = document.getElementById('manualVICardContent');
    if (manualVICardContent) manualVICardContent.style.display = 'block';
    const claimCoverageOverlay = document.getElementById('claimCoverageOverlay');
    if (claimCoverageOverlay) claimCoverageOverlay.style.display = 'none'; // Hide overlay initially
    const manualVIPage = document.getElementById('manualVIPage');
    if (manualVIPage) manualVIPage.classList.remove('claim-coverage-active'); // Remove class if present
    hideAllMainContent();
    // Ensure all other full-page views are hidden
    const csatModal = document.getElementById('csatModal');
    if (csatModal) csatModal.style.display = 'none';
    const endorsementPage = document.getElementById('endorsementPage');
    if (endorsementPage) endorsementPage.style.display = 'none';
    const claimCountNSTPPage = document.getElementById('claimCountNSTPPage');
    if (claimCountNSTPPage) claimCountNSTPPage.style.display = 'none';
    const inspectionWaiverPage = document.getElementById('inspectionWaiverPage');
    if (inspectionWaiverPage) inspectionWaiverPage.style.display = 'none';
    const rsaContactPage = document.getElementById('rsaContactPage');
    if (rsaContactPage) rsaContactPage.style.display = 'none';
};

window.closeManualVIPage = function () {
    const manualVIPage = document.getElementById('manualVIPage');
    if (manualVIPage) manualVIPage.style.display = 'none';
    showAllMainContent();
    // Also hide the claim coverage overlay when going back to home
    const claimCoverageOverlay = document.getElementById('claimCoverageOverlay');
    if (claimCoverageOverlay) claimCoverageOverlay.style.display = 'none';
    const manualVIPageClassList = document.getElementById('manualVIPage');
    if (manualVIPageClassList) manualVIPageClassList.classList.remove('claim-coverage-active');
};

// Toggle Claim Coverage Overlay within Manual VI Page
window.toggleClaimCoverage = function () {
    const manualVICardContent = document.getElementById('manualVICardContent');
    const claimCoverageOverlay = document.getElementById('claimCoverageOverlay');
    const manualVIPage = document.getElementById('manualVIPage');

    if (claimCoverageOverlay && manualVICardContent && manualVIPage) {
        if (claimCoverageOverlay.style.display === 'flex') {
            // If overlay is visible, hide it and show main card content
            claimCoverageOverlay.style.display = 'none';
            manualVICardContent.style.display = 'block';
            manualVIPage.classList.remove('claim-coverage-active'); // Remove class
        } else {
            // If overlay is hidden, show it and hide main card content
            claimCoverageOverlay.style.display = 'flex';
            manualVICardContent.style.display = 'none';
            manualVIPage.classList.add('claim-coverage-active'); // Add class for styling
        }
    }
};

// Close Manual VI Page OR Claim Coverage Overlay on Outside Click
document.getElementById('manualVIPage').addEventListener('click', function (event) {
    // If the click is directly on the manual-vi-page (background),
    // regardless of which sub-section is open, close the entire page.
    if (event.target === this) {
        closeManualVIPage();
    }
});

// New: Add click listener to the claimCoverageOverlay to close the entire manualVIPage
document.getElementById('claimCoverageOverlay').addEventListener('click', function (event) {
    if (event.target === this) { // Only if the click is directly on the overlay's background
        closeManualVIPage(); // Go back to the main page
    }
});


// #endregion

// #region 🔒 CLAIM COUNT & NSTP
// New Claim_Count & NSTP Page Functionality
window.openClaimCountNSTPPage = function () {
    document.getElementById('claimCountNSTPPage').style.display = 'block';
    hideAllMainContent();
    // Ensure all other full-page views are hidden
    const csatModal = document.getElementById('csatModal');
    if (csatModal) csatModal.style.display = 'none';
    const endorsementPage = document.getElementById('endorsementPage');
    if (endorsementPage) endorsementPage.style.display = 'none';
    const manualVIPage = document.getElementById('manualVIPage');
    if (manualVIPage) manualVIPage.style.display = 'none';
    const inspectionWaiverPage = document.getElementById('inspectionWaiverPage');
    if (inspectionWaiverPage) inspectionWaiverPage.style.display = 'none';
    const rsaContactPage = document.getElementById('rsaContactPage');
    if (rsaContactPage) rsaContactPage.style.display = 'none';
    // Populate the table when the page is opened
    populateTable(insuranceData);
    // Re-apply sort/search listeners as content is dynamic
    setupInsuranceDashboardListeners();
};

window.closeClaimCountNSTPPage = function () {
    const claimCountNSTPPage = document.getElementById('claimCountNSTPPage');
    if (claimCountNSTPPage) claimCountNSTPPage.style.display = 'none';
    showAllMainContent();
};

// Close Claim_Count & NSTP Page on Outside Click
document.getElementById('claimCountNSTPPage').addEventListener('click', function (event) {
    if (event.target === this) {
        // Only close if the click is directly on the overlay, not on the content
        if (event.target.classList.contains('claim-count-nstp-page')) {
            closeClaimCountNSTPPage();
        }
    }
});

// #endregion

// #region 🔒 INSPECTION WAIVER PAGE
// New Inspection Waiver Page Functionality
window.openInspectionWaiverPage = function () {
    document.getElementById('inspectionWaiverPage').style.display = 'block';
    hideAllMainContent();
    // Ensure all other full-page views are hidden
    const csatModal = document.getElementById('csatModal');
    if (csatModal) csatModal.style.display = 'none';
    const endorsementPage = document.getElementById('endorsementPage');
    if (endorsementPage) endorsementPage.style.display = 'none';
    const manualVIPage = document.getElementById('manualVIPage');
    if (manualVIPage) manualVIPage.style.display = 'none';
    const claimCountNSTPPage = document.getElementById('claimCountNSTPPage');
    if (claimCountNSTPPage) claimCountNSTPPage.style.display = 'none';
    const rsaContactPage = document.getElementById('rsaContactPage');
    if (rsaContactPage) rsaContactPage.style.display = 'none';
    // Add a small delay to ensure the page is fully rendered before populating
    setTimeout(() => {
        populateInspectionWaiverTable(inspectionWaiverData);
        console.log("Inspection Waiver table populated with data:", inspectionWaiverData); // Debugging log
    }, 0);
};

window.closeInspectionWaiverPage = function () {
    const inspectionWaiverPage = document.getElementById('inspectionWaiverPage');
    if (inspectionWaiverPage) inspectionWaiverPage.style.display = 'none';
    showAllMainContent();
};

// Close Inspection Waiver Page on Outside Click
document.getElementById('inspectionWaiverPage').addEventListener('click', function (event) {
    if (event.target === this) {
        closeInspectionWaiverPage();
    }
});

// #endregion

// #region 🔒 RSA & CONTACT PAGE
// New RSA & Contact Page Functionality
window.openRSAPage = function () {
    document.getElementById('rsaContactPage').style.display = 'block';
    hideAllMainContent();
    // Ensure all other full-page views are hidden
    const csatModal = document.getElementById('csatModal');
    if (csatModal) csatModal.style.display = 'none';
    const endorsementPage = document.getElementById('endorsementPage');
    if (endorsementPage) endorsementPage.style.display = 'none';
    const manualVIPage = document.getElementById('manualVIPage');
    if (manualVIPage) manualVIPage.style.display = 'none';
    const claimCountNSTPPage = document.getElementById('claimCountNSTPPage');
    if (claimCountNSTPPage) claimCountNSTPPage.style.display = 'none';
    const inspectionWaiverPage = document.getElementById('inspectionWaiverPage');
    if (inspectionWaiverPage) inspectionWaiverPage.style.display = 'none';
    // Add a small delay to ensure the page is fully rendered before populating
    setTimeout(() => {
        populateRSATable(rsaContactData);
        console.log("RSA & Contact table populated with data:", rsaContactData); // Debugging log
    }, 0);
    setupRSADashboardListeners();
};

window.closeRSAPage = function () {
    const rsaContactPage = document.getElementById('rsaContactPage');
    if (rsaContactPage) rsaContactPage.style.display = 'none';
    showAllMainContent();
};

// Close RSA & Contact Page on Outside Click
document.getElementById('rsaContactPage').addEventListener('click', function (event) {
    if (event.target === this) {
        closeRSAPage();
    }
});

// #endregion

// #region 🔒 VISIBILITY HELPERS
// Helper functions to manage visibility
function hideAllMainContent() {
    const uploadSection = document.querySelector('.upload-section');
    if (uploadSection) uploadSection.style.display = 'none';
    const h3Element = document.querySelector('h3'); /* 'Uploaded Images' header */
    if (h3Element) h3Element.style.display = 'none';
    const gallery = document.getElementById('gallery');
    if (gallery) gallery.style.display = 'none';
    const csatBtn = document.querySelector('.csat-btn');
    if (csatBtn) csatBtn.style.display = 'none';
    const endorsementBtn = document.querySelector('.endorsement-btn');
    if (endorsementBtn) endorsementBtn.style.display = 'none';
    const manualVIBtnFixed = document.querySelector('.manual-vi-btn-fixed');
    if (manualVIBtnFixed) manualVIBtnFixed.style.display = 'none';
    const claimCountNSTPBtnFixed = document.querySelector('.claim-count-nstp-btn-fixed');
    if (claimCountNSTPBtnFixed) claimCountNSTPBtnFixed.style.display = 'none';
    const inspectionWaiverBtnFixed = document.querySelector('.inspection-waiver-btn-fixed');
    if (inspectionWaiverBtnFixed) inspectionWaiverBtnFixed.style.display = 'none';
    const rsaContactBtnFixed = document.querySelector('.rsa-contact-btn-fixed');
    if (rsaContactBtnFixed) rsaContactBtnFixed.style.display = 'none';
    const companyUpdatesButton = document.getElementById('companyUpdatesButton');
    if (companyUpdatesButton) companyUpdatesButton.style.display = 'none';
    const notebookButton = document.getElementById('notebookButton');
    if (notebookButton) notebookButton.style.display = 'none';
}

function showAllMainContent() {
    const uploadSection = document.querySelector('.upload-section');
    if (uploadSection) uploadSection.style.display = 'block';
    const h3Element = document.querySelector('h3'); /* 'Uploaded Images' header */
    if (h3Element) h3Element.style.display = 'block';
    const gallery = document.getElementById('gallery');
    if (gallery) gallery.style.display = 'grid'; /* grid for gallery */

    // Only show fixed buttons if not on mobile (based on media query)
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    if (!isMobile) {
        const csatBtn = document.querySelector('.csat-btn');
        if (csatBtn) csatBtn.style.display = 'block';
        const endorsementBtn = document.querySelector('.endorsement-btn');
        if (endorsementBtn) endorsementBtn.style.display = 'block';
        const manualVIBtnFixed = document.querySelector('.manual-vi-btn-fixed');
        if (manualVIBtnFixed) manualVIBtnFixed.style.display = 'block';
        const claimCountNSTPBtnFixed = document.querySelector('.claim-count-nstp-btn-fixed');
        if (claimCountNSTPBtnFixed) claimCountNSTPBtnFixed.style.display = 'block';
        const inspectionWaiverBtnFixed = document.querySelector('.inspection-waiver-btn-fixed');
        if (inspectionWaiverBtnFixed) inspectionWaiverBtnFixed.style.display = 'block';
        const rsaContactBtnFixed = document.querySelector('.rsa-contact-btn-fixed');
        if (rsaContactBtnFixed) rsaContactBtnFixed.style.display = 'block';
    }
    // Explicitly control visibility of the new updates button
    const companyUpdatesButton = document.getElementById('companyUpdatesButton');
    if (companyUpdatesButton) companyUpdatesButton.style.display = 'flex';
    const notebookButton = document.getElementById('notebookButton');
    if (notebookButton) notebookButton.style.display = 'flex';
}

// #endregion

// #region 🔒 ENDORSEMENT DATA (JSON)
const insurerDropdown = document.querySelector('.endorsement-page #insurer');
const requirementDropdown = document.querySelector('.endorsement-page #requirement');
const outputBox = document.querySelector('.endorsement-page #output');

// Empty array for you to manually add JSON data for Endorsement
const endorsementData = [
    {
        "InsurerRequirement": "New India AssuranceAddition of GST No.",
        "Insurer": "New India Assurance",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceChassis Number",
        "Insurer": "New India Assurance",
        "Requirement": "Chassis Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceColour Change",
        "Insurer": "New India Assurance",
        "Requirement": "Colour Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceEngine Number",
        "Insurer": "New India Assurance",
        "Requirement": "Engine Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceHypothecation Remove",
        "Insurer": "New India Assurance",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC, NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceHypothecation Add",
        "Insurer": "New India Assurance",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Updated RC or Loan sanction letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceHypothecation Change",
        "Insurer": "New India Assurance",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Updated RC or NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceInsured name",
        "Insurer": "New India Assurance",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceNCB Certificate",
        "Insurer": "New India Assurance",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale letter or new vehicle invoice, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Kindly request the customer to provide in written on mail or from MyAccount:\r\nKindly confirm whether customer wants to cancel the Own damage part of the policy or want to recover the ncb."
    },
    {
        "InsurerRequirement": "New India AssuranceRegistration Date",
        "Insurer": "New India Assurance",
        "Requirement": "Registration Date",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceRegst. Number",
        "Insurer": "New India Assurance",
        "Requirement": "Regst. Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceRTO Endorsement",
        "Insurer": "New India Assurance",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceSeating Capacity",
        "Insurer": "New India Assurance",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssurancePeriod of Insurance (POI)",
        "Insurer": "New India Assurance",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssurancePYP Details- POI or Insurer or Policy number",
        "Insurer": "New India Assurance",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceTP details",
        "Insurer": "New India Assurance",
        "Requirement": "TP details",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Bundled TP or PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceCommunication Address",
        "Insurer": "New India Assurance",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceDate of Birth (DOB)",
        "Insurer": "New India Assurance",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceEmail Address",
        "Insurer": "New India Assurance",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceMobile Number",
        "Insurer": "New India Assurance",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceNominee Details",
        "Insurer": "New India Assurance",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceSalutation",
        "Insurer": "New India Assurance",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceOwner Driver Personal Accident",
        "Insurer": "New India Assurance",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssurancePaid Driver",
        "Insurer": "New India Assurance",
        "Requirement": "Paid Driver",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceUn Named Passanger Cover",
        "Insurer": "New India Assurance",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceCNG Addition External",
        "Insurer": "New India Assurance",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceCNG Addition Company fitted",
        "Insurer": "New India Assurance",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceCubic Capacity (CC)",
        "Insurer": "New India Assurance",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "New India Assurance",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceIDV Change",
        "Insurer": "New India Assurance",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceManufactured Date",
        "Insurer": "New India Assurance",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceMake, Model & Variant",
        "Insurer": "New India Assurance",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceOwnership Transfer",
        "Insurer": "New India Assurance",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, New owner details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceNCB Correction (taken extra NCB)",
        "Insurer": "New India Assurance",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceNCB Correction (taken less NCB)",
        "Insurer": "New India Assurance",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceTop Up (PAYD plan)",
        "Insurer": "New India Assurance",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "New India Assurance",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC,KYC,PYP, Proposal Form & Bank statement with payee name",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssurancePost Issuance Cancellation",
        "Insurer": "New India Assurance",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "NA",
        "Documents or any other requirement": "Alternate Policy with same POI or POI before the start of the policy which is to be cancelled and Reason for cancellation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Declaration Required:\r\nI/We hereby declare that Policy No. _____________________ for Vehicle No. _____________________, covering the period from _____________________ to _____________________, was purchased by me/us on _____________________.\r\nDue to ________________________________________________, I/we request the cancellation of the above-mentioned Policy No. _____________________.\r\nI/we further confirm that no claims have been made under this policy or any other policy related to the said vehicle till date. I/we also confirm that an alternate policy, Policy No. _____________________, valid from _____________________, issued by _______________________________, has been provided and is currently active."
    },
    {
        "InsurerRequirement": "New India AssurancePost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "New India Assurance",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "NA",
        "Documents or any other requirement": "Not Possible",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Not Possible",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "New India AssuranceM-Parivahan",
        "Insurer": "New India Assurance",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliAddition of GST No.",
        "Insurer": "Future Generali",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliChassis Number",
        "Insurer": "Future Generali",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliColour Change",
        "Insurer": "Future Generali",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliEngine Number",
        "Insurer": "Future Generali",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliHypothecation Remove",
        "Insurer": "Future Generali",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliHypothecation Add",
        "Insurer": "Future Generali",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or Loan sanction letter,",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliHypothecation Change",
        "Insurer": "Future Generali",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliInsured name",
        "Insurer": "Future Generali",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP\r\nFor Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliNCB Certificate",
        "Insurer": "Future Generali",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": "Kindly request the customer to provide in written on mail or from MyAccount:\r\nKindly confirm whether customer wants to cancel the Own damage part of the policy or want to recover the ncb."
    },
    {
        "InsurerRequirement": "Future GeneraliRegistration Date",
        "Insurer": "Future Generali",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliRegst. Number",
        "Insurer": "Future Generali",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliRTO Endorsement",
        "Insurer": "Future Generali",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliSeating Capacity",
        "Insurer": "Future Generali",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliPeriod of Insurance (POI)",
        "Insurer": "Future Generali",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliPYP Details- POI or Insurer or Policy number",
        "Insurer": "Future Generali",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliTP details",
        "Insurer": "Future Generali",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Bundled TP or PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliCommunication Address",
        "Insurer": "Future Generali",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Complete address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliDate of Birth (DOB)",
        "Insurer": "Future Generali",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliEmail Address",
        "Insurer": "Future Generali",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliMobile Number",
        "Insurer": "Future Generali",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliNominee Details",
        "Insurer": "Future Generali",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliSalutation",
        "Insurer": "Future Generali",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliOwner Driver Personal Accident",
        "Insurer": "Future Generali",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, DL, Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliPaid Driver",
        "Insurer": "Future Generali",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, Salary slip of last 3 months, DL of the driver",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliUn Named Passanger Cover",
        "Insurer": "Future Generali",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, written confirmation of coverage for Rs.50 - 1L and Rs.100/-  2L",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliCNG Addition External",
        "Insurer": "Future Generali",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliCNG Addition Company fitted",
        "Insurer": "Future Generali",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliCubic Capacity (CC)",
        "Insurer": "Future Generali",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Future Generali",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliIDV Change",
        "Insurer": "Future Generali",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliManufactured Date",
        "Insurer": "Future Generali",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliMake, Model & Variant",
        "Insurer": "Future Generali",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliOwnership Transfer",
        "Insurer": "Future Generali",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, New owner details, KYC, NOC & Proposal form (NOC & PF format availble on MyAccount)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliNCB Correction (taken extra NCB)",
        "Insurer": "Future Generali",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet\r\nIf the NCB needs to be updated to 0%, an inspection is mandatory.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliNCB Correction (taken less NCB)",
        "Insurer": "Future Generali",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliTop Up (PAYD plan)",
        "Insurer": "Future Generali",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Future Generali",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliPost Issuance Cancellation",
        "Insurer": "Future Generali",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy\r\n\r\nWritten declaration with signature on KYC Xerox paper (Either PAN or Driving Licence)\r\nDeclaration wordings - I want to cancel my policy wide <<policy no.>> and proceed the refund.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "",
        "Any Exception": "For Ticketing Associates: Raise cancellation to insurer & meanwhile XML Sheet to tech",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Future Generali",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.\r\n\r\nFor ticketing associate: Raise cancellation with XML Sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Future GeneraliM-Parivahan",
        "Insurer": "Future Generali",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticketing associate: Raise endorsement with XML sheet",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioAddition of GST No.",
        "Insurer": "Iffco tokio",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioChassis Number",
        "Insurer": "Iffco tokio",
        "Requirement": "Chassis Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioColour Change",
        "Insurer": "Iffco tokio",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioEngine Number",
        "Insurer": "Iffco tokio",
        "Requirement": "Engine Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioHypothecation Remove",
        "Insurer": "Iffco tokio",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioHypothecation Add",
        "Insurer": "Iffco tokio",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or Loan sanction letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioHypothecation Change",
        "Insurer": "Iffco tokio",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioInsured name",
        "Insurer": "Iffco tokio",
        "Requirement": "Insured name",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC, PYP, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "correction can be done Post start date of the policy \r\nProceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioNCB Certificate",
        "Insurer": "Iffco tokio",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Kindly request the customer to provide in written on mail or from MyAccount:\r\nKindly confirm whether customer wants to cancel the Own damage part of the policy or want to recover the ncb."
    },
    {
        "InsurerRequirement": "Iffco tokioRegistration Date",
        "Insurer": "Iffco tokio",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioRegst. Number",
        "Insurer": "Iffco tokio",
        "Requirement": "Regst. Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioRTO Endorsement",
        "Insurer": "Iffco tokio",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioSeating Capacity",
        "Insurer": "Iffco tokio",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioPeriod of Insurance (POI)",
        "Insurer": "Iffco tokio",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioPYP Details- POI or Insurer or Policy number",
        "Insurer": "Iffco tokio",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioTP details",
        "Insurer": "Iffco tokio",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Bundled TP or PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioCommunication Address",
        "Insurer": "Iffco tokio",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Address Proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioDate of Birth (DOB)",
        "Insurer": "Iffco tokio",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioEmail Address",
        "Insurer": "Iffco tokio",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioMobile Number",
        "Insurer": "Iffco tokio",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioNominee Details",
        "Insurer": "Iffco tokio",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioSalutation",
        "Insurer": "Iffco tokio",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioOwner Driver Personal Accident",
        "Insurer": "Iffco tokio",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, Insured DL & Nominee Name, Age & Relationship",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioPaid Driver",
        "Insurer": "Iffco tokio",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, Salary slip of last 3 months, DL of the driver",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioUn Named Passanger Cover",
        "Insurer": "Iffco tokio",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, written confirmation of coverage for Rs.50 - 1L and Rs.100/-  2L",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioCNG Addition External",
        "Insurer": "Iffco tokio",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioCNG Addition Company fitted",
        "Insurer": "Iffco tokio",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioCubic Capacity (CC)",
        "Insurer": "Iffco tokio",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Iffco tokio",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioIDV Change",
        "Insurer": "Iffco tokio",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioManufactured Date",
        "Insurer": "Iffco tokio",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioMake, Model & Variant",
        "Insurer": "Iffco tokio",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioOwnership Transfer",
        "Insurer": "Iffco tokio",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, New owner details, KYC, NOC from previous owner (in a format, format is with the ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "correction possible Post start date of the policy\r\nFor ticketing associate: Raise request to insurer with NOC in the said format",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioNCB Correction (taken extra NCB)",
        "Insurer": "Iffco tokio",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioNCB Correction (taken less NCB)",
        "Insurer": "Iffco tokio",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioTop Up (PAYD plan)",
        "Insurer": "Iffco tokio",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Iffco tokio",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioPost Issuance Cancellation",
        "Insurer": "Iffco tokio",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Iffco tokio",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Iffco tokioM-Parivahan",
        "Insurer": "Iffco tokio",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "No requirement",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaAddition of GST No.",
        "Insurer": "Magma",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaChassis Number",
        "Insurer": "Magma",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaColour Change",
        "Insurer": "Magma",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaEngine Number",
        "Insurer": "Magma",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaHypothecation Remove",
        "Insurer": "Magma",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaHypothecation Add",
        "Insurer": "Magma",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Updated RC or Loan sanction letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaHypothecation Change",
        "Insurer": "Magma",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaInsured name",
        "Insurer": "Magma",
        "Requirement": "Insured name",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC, PYP, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaNCB Certificate",
        "Insurer": "Magma",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Kindly request the customer to provide in written on mail or from MyAccount:\r\nKindly confirm whether customer wants to cancel the Own damage part of the policy or want to recover the ncb."
    },
    {
        "InsurerRequirement": "MagmaRegistration Date",
        "Insurer": "Magma",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaRegst. Number",
        "Insurer": "Magma",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaRTO Endorsement",
        "Insurer": "Magma",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaSeating Capacity",
        "Insurer": "Magma",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaPeriod of Insurance (POI)",
        "Insurer": "Magma",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP,KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaPYP Details- POI or Insurer or Policy number",
        "Insurer": "Magma",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaTP details",
        "Insurer": "Magma",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Bundled TP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaCommunication Address",
        "Insurer": "Magma",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaDate of Birth (DOB)",
        "Insurer": "Magma",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaEmail Address",
        "Insurer": "Magma",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaMobile Number",
        "Insurer": "Magma",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaNominee Details",
        "Insurer": "Magma",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaSalutation",
        "Insurer": "Magma",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaOwner Driver Personal Accident",
        "Insurer": "Magma",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, DL, Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaPaid Driver",
        "Insurer": "Magma",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, Salary slip of last 3 months, DL of the driver",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaUn Named Passanger Cover",
        "Insurer": "Magma",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, written confirmation of coverage for Rs.50 - 1L and Rs.100/-  2L",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaCNG Addition External",
        "Insurer": "Magma",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaCNG Addition Company fitted",
        "Insurer": "Magma",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaCubic Capacity (CC)",
        "Insurer": "Magma",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Magma",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaIDV Change",
        "Insurer": "Magma",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaManufactured Date",
        "Insurer": "Magma",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaMake, Model & Variant",
        "Insurer": "Magma",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaOwnership Transfer",
        "Insurer": "Magma",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, New owner details, KYC, Proposal form (PF format availble on MyAccount)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaNCB Correction (taken extra NCB)",
        "Insurer": "Magma",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaNCB Correction (taken less NCB)",
        "Insurer": "Magma",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaTop Up (PAYD plan)",
        "Insurer": "Magma",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Magma",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaPost Issuance Cancellation",
        "Insurer": "Magma",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy, KYC & NEFT details of the Insured\r\nAccount holder name - \r\nBank Name - \r\nAccount Number - \r\nIFSC Code -",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Magma",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "MagmaM-Parivahan",
        "Insurer": "Magma",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaAddition of GST No.",
        "Insurer": "Raheja",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN Card mandate in KYC",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaChassis Number",
        "Insurer": "Raheja",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaColour Change",
        "Insurer": "Raheja",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaEngine Number",
        "Insurer": "Raheja",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaHypothecation Remove",
        "Insurer": "Raheja",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "NOC or Updated RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaHypothecation Add",
        "Insurer": "Raheja",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or Loan sanction letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaHypothecation Change",
        "Insurer": "Raheja",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaInsured name",
        "Insurer": "Raheja",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN Card mandate in KYC + Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaNCB Certificate",
        "Insurer": "Raheja",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Kindly request the customer to provide in written on mail or from MyAccount:\r\nKindly confirm whether customer wants to cancel the Own damage part of the policy or want to recover the ncb."
    },
    {
        "InsurerRequirement": "RahejaRegistration Date",
        "Insurer": "Raheja",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaRegst. Number",
        "Insurer": "Raheja",
        "Requirement": "Regst. Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaRTO Endorsement",
        "Insurer": "Raheja",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaSeating Capacity",
        "Insurer": "Raheja",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaPeriod of Insurance (POI)",
        "Insurer": "Raheja",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP & Customer declaration required on mail (I don't have any issue to cancel & rebook the insurance)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaPYP Details- POI or Insurer or Policy number",
        "Insurer": "Raheja",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaTP details",
        "Insurer": "Raheja",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Bundled TP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaCommunication Address",
        "Insurer": "Raheja",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Address Proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaDate of Birth (DOB)",
        "Insurer": "Raheja",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaEmail Address",
        "Insurer": "Raheja",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Email Id",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaMobile Number",
        "Insurer": "Raheja",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaNominee Details",
        "Insurer": "Raheja",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaSalutation",
        "Insurer": "Raheja",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaOwner Driver Personal Accident",
        "Insurer": "Raheja",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaPaid Driver",
        "Insurer": "Raheja",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, Salary slip of last 3 months, DL of the driver",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaUn Named Passanger Cover",
        "Insurer": "Raheja",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, written confirmation of coverage for Rs.50 - 1L and Rs.100/-  2L",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaCNG Addition External",
        "Insurer": "Raheja",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaCNG Addition Company fitted",
        "Insurer": "Raheja",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaCubic Capacity (CC)",
        "Insurer": "Raheja",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Raheja",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaIDV Change",
        "Insurer": "Raheja",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaManufactured Date",
        "Insurer": "Raheja",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaMake, Model & Variant",
        "Insurer": "Raheja",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaOwnership Transfer",
        "Insurer": "Raheja",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, New owner details, KYC, \r\nDeclaration from old owner (Written confirmation on mail from Old owner with date & SIgnature - that he has no objection in transferring the policy to the new owner)\r\n& CPA declaration form (available with ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "PAN Card mandate in KYC",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaNCB Correction (taken extra NCB)",
        "Insurer": "Raheja",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaNCB Correction (taken less NCB)",
        "Insurer": "Raheja",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaTop Up (PAYD plan)",
        "Insurer": "Raheja",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Raheja",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaPost Issuance Cancellation",
        "Insurer": "Raheja",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Raheja",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RahejaM-Parivahan",
        "Insurer": "Raheja",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramAddition of GST No.",
        "Insurer": "Royal Sundaram",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramChassis Number",
        "Insurer": "Royal Sundaram",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramColour Change",
        "Insurer": "Royal Sundaram",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramEngine Number",
        "Insurer": "Royal Sundaram",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramHypothecation Remove",
        "Insurer": "Royal Sundaram",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramHypothecation Add",
        "Insurer": "Royal Sundaram",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or Loan sanction letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramHypothecation Change",
        "Insurer": "Royal Sundaram",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramInsured name",
        "Insurer": "Royal Sundaram",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramNCB Certificate",
        "Insurer": "Royal Sundaram",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Kindly request the customer to provide in written on mail or from MyAccount:\r\nKindly confirm whether customer wants to cancel the Own damage part of the policy or want to recover the ncb."
    },
    {
        "InsurerRequirement": "Royal SundaramRegistration Date",
        "Insurer": "Royal Sundaram",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramRegst. Number",
        "Insurer": "Royal Sundaram",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramRTO Endorsement",
        "Insurer": "Royal Sundaram",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramSeating Capacity",
        "Insurer": "Royal Sundaram",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramPeriod of Insurance (POI)",
        "Insurer": "Royal Sundaram",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramPYP Details- POI or Insurer or Policy number",
        "Insurer": "Royal Sundaram",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramTP details",
        "Insurer": "Royal Sundaram",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Bundled TP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramCommunication Address",
        "Insurer": "Royal Sundaram",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Complete address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramDate of Birth (DOB)",
        "Insurer": "Royal Sundaram",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramEmail Address",
        "Insurer": "Royal Sundaram",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramMobile Number",
        "Insurer": "Royal Sundaram",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramNominee Details",
        "Insurer": "Royal Sundaram",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramSalutation",
        "Insurer": "Royal Sundaram",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramOwner Driver Personal Accident",
        "Insurer": "Royal Sundaram",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, DL, Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Addition possible Before policy Start Date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramPaid Driver",
        "Insurer": "Royal Sundaram",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, Salary slip of last 3 months, DL of the driver",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Addition possible Before policy Start Date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramUn Named Passanger Cover",
        "Insurer": "Royal Sundaram",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, written confirmation of coverage for Rs.50 - 1L and Rs.100/-  2L",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Addition possible Before policy Start Date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramCNG Addition External",
        "Insurer": "Royal Sundaram",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramCNG Addition Company fitted",
        "Insurer": "Royal Sundaram",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramCubic Capacity (CC)",
        "Insurer": "Royal Sundaram",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Royal Sundaram",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramIDV Change",
        "Insurer": "Royal Sundaram",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramManufactured Date",
        "Insurer": "Royal Sundaram",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramMake, Model & Variant",
        "Insurer": "Royal Sundaram",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramOwnership Transfer",
        "Insurer": "Royal Sundaram",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, New owner details, KYC, Proposal form (sample available on MyAccount)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramNCB Correction (taken extra NCB)",
        "Insurer": "Royal Sundaram",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramNCB Correction (taken less NCB)",
        "Insurer": "Royal Sundaram",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramTop Up (PAYD plan)",
        "Insurer": "Royal Sundaram",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Royal Sundaram",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramPost Issuance Cancellation",
        "Insurer": "Royal Sundaram",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy & Customer declaration (with customer signature)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Declaration on paper: I want to cancel my policy no __________ due to ___________ reason. (Along with customer's signature)"
    },
    {
        "InsurerRequirement": "Royal SundaramPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Royal Sundaram",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent, Alternate policy, Cancelled cheque",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Royal SundaramM-Parivahan",
        "Insurer": "Royal Sundaram",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoAddition of GST No.",
        "Insurer": "Zuno",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoChassis Number",
        "Insurer": "Zuno",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoColour Change",
        "Insurer": "Zuno",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoEngine Number",
        "Insurer": "Zuno",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoHypothecation Remove",
        "Insurer": "Zuno",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "NOC or Updated RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoHypothecation Add",
        "Insurer": "Zuno",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or Loan sanction letter, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoHypothecation Change",
        "Insurer": "Zuno",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or NOC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoInsured name",
        "Insurer": "Zuno",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP\r\nFor ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoNCB Certificate",
        "Insurer": "Zuno",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale letter, PYP, NCB Confirmation letter, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": "Kindly request the customer to provide in written on mail or from MyAccount:\r\nKindly confirm whether customer wants to cancel the Own damage part of the policy or want to recover the ncb."
    },
    {
        "InsurerRequirement": "ZunoRegistration Date",
        "Insurer": "Zuno",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoRegst. Number",
        "Insurer": "Zuno",
        "Requirement": "Regst. Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoRTO Endorsement",
        "Insurer": "Zuno",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoSeating Capacity",
        "Insurer": "Zuno",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoPeriod of Insurance (POI)",
        "Insurer": "Zuno",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoPYP Details- POI or Insurer or Policy number",
        "Insurer": "Zuno",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoTP details",
        "Insurer": "Zuno",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Bundled TP, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoCommunication Address",
        "Insurer": "Zuno",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete address with pincode (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Incase raising to insurer then KYC - Pan Card and Unmasked Aadhar card is required",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoDate of Birth (DOB)",
        "Insurer": "Zuno",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoEmail Address",
        "Insurer": "Zuno",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Incase raising to insurer then KYC - Pan Card and Unmasked Aadhar card is required",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoMobile Number",
        "Insurer": "Zuno",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Incase raising to insurer then KYC - Pan Card and Unmasked Aadhar card is required",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoNominee Details",
        "Insurer": "Zuno",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Incase raising to insurer then KYC - Pan Card and Unmasked Aadhar card is required",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoSalutation",
        "Insurer": "Zuno",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Incase raising to insurer then KYC - Pan Card and Unmasked Aadhar card is required",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoOwner Driver Personal Accident",
        "Insurer": "Zuno",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, DL, Nominee Details, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Correction possible Before Policy Start Date, \r\nFor Ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoPaid Driver",
        "Insurer": "Zuno",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, Salary slip of last 3 months, DL of the driver, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Correction possible Before Policy Start Date, \r\nFor Ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoUn Named Passanger Cover",
        "Insurer": "Zuno",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, written confirmation of coverage for Rs.50 - 1L and Rs.100/-  2L, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Correction possible Before Policy Start Date, \r\nFor Ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoCNG Addition External",
        "Insurer": "Zuno",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoCNG Addition Company fitted",
        "Insurer": "Zuno",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoCubic Capacity (CC)",
        "Insurer": "Zuno",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Zuno",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoIDV Change",
        "Insurer": "Zuno",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoManufactured Date",
        "Insurer": "Zuno",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoMake, Model & Variant",
        "Insurer": "Zuno",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoOwnership Transfer",
        "Insurer": "Zuno",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, New owner details, KYC, Proposal form (available on MyAccount), KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoNCB Correction (taken extra NCB)",
        "Insurer": "Zuno",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoNCB Correction (taken less NCB)",
        "Insurer": "Zuno",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoTop Up (PAYD plan)",
        "Insurer": "Zuno",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Zuno",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoPost Issuance Cancellation",
        "Insurer": "Zuno",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy, KYC - Pan Card and Unmasked Aadhar card (Unmasked adhar required only incase policy number starts with 52, else masked adhar card acceptable)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "For ticketing associates: Feedfile required while raising the endorsement if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Zuno",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Cancellation and correction is not possible",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Cancellation and correction is not possible",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ZunoM-Parivahan",
        "Insurer": "Zuno",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For ticketing associates: Feedfile required while raising the case if Policy number starts with 52 series",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitAddition of GST No.",
        "Insurer": "Digit",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible only within a month of policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitChassis Number",
        "Insurer": "Digit",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitColour Change",
        "Insurer": "Digit",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitEngine Number",
        "Insurer": "Digit",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitHypothecation Remove",
        "Insurer": "Digit",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitHypothecation Add",
        "Insurer": "Digit",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or Loan sanction letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitHypothecation Change",
        "Insurer": "Digit",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitInsured name",
        "Insurer": "Digit",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitNCB Certificate",
        "Insurer": "Digit",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Kindly request the customer to provide in written on mail or from MyAccount:\r\nKindly confirm whether customer wants to cancel the Own damage part of the policy or want to recover the ncb."
    },
    {
        "InsurerRequirement": "DigitRegistration Date",
        "Insurer": "Digit",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitRegst. Number",
        "Insurer": "Digit",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitRTO Endorsement",
        "Insurer": "Digit",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitSeating Capacity",
        "Insurer": "Digit",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitPeriod of Insurance (POI)",
        "Insurer": "Digit",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible before policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitPYP Details- POI or Insurer or Policy number",
        "Insurer": "Digit",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitTP details",
        "Insurer": "Digit",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Bundled TP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitCommunication Address",
        "Insurer": "Digit",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Complete address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitDate of Birth (DOB)",
        "Insurer": "Digit",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitEmail Address",
        "Insurer": "Digit",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitMobile Number",
        "Insurer": "Digit",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitNominee Details",
        "Insurer": "Digit",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitSalutation",
        "Insurer": "Digit",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitOwner Driver Personal Accident",
        "Insurer": "Digit",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Nominee Details & Customer Consent",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Correction possible before policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitPaid Driver",
        "Insurer": "Digit",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Only",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Correction possible before policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitUn Named Passanger Cover",
        "Insurer": "Digit",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, written confirmation of coverage for Rs.50 - 1L and Rs.100/-  2L",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Correction possible before policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitCNG Addition External",
        "Insurer": "Digit",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitCNG Addition Company fitted",
        "Insurer": "Digit",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitCubic Capacity (CC)",
        "Insurer": "Digit",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Digit",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitIDV Change",
        "Insurer": "Digit",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitManufactured Date",
        "Insurer": "Digit",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitMake, Model & Variant",
        "Insurer": "Digit",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitOwnership Transfer",
        "Insurer": "Digit",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, New owner details, KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitNCB Correction (taken extra NCB)",
        "Insurer": "Digit",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitNCB Correction (taken less NCB)",
        "Insurer": "Digit",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP, NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitTop Up (PAYD plan)",
        "Insurer": "Digit",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Customer consent for Top up Limit",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Digit",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitPost Issuance Cancellation",
        "Insurer": "Digit",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deductible",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Digit",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "DigitM-Parivahan",
        "Insurer": "Digit",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "No Requirement",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaAddition of GST No.",
        "Insurer": "Chola",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaChassis Number",
        "Insurer": "Chola",
        "Requirement": "Chassis Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaColour Change",
        "Insurer": "Chola",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaEngine Number",
        "Insurer": "Chola",
        "Requirement": "Engine Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaHypothecation Remove",
        "Insurer": "Chola",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Bank NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaHypothecation Add",
        "Insurer": "Chola",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Updated RC  or Loan Sanction letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaHypothecation Change",
        "Insurer": "Chola",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Updated RC and Previous Bank NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaInsured name",
        "Insurer": "Chola",
        "Requirement": "Insured name",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC ,PYP and Umasked Aadhar Card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaNCB Certificate",
        "Insurer": "Chola",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sell Letter with stamp / RC cancellation receipt or NCB Recovery (Charges)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaRegistration Date",
        "Insurer": "Chola",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "Correction not possible in Bundle Policy",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaRegst. Number",
        "Insurer": "Chola",
        "Requirement": "Regst. Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaRTO Endorsement",
        "Insurer": "Chola",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaSeating Capacity",
        "Insurer": "Chola",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaPeriod of Insurance (POI)",
        "Insurer": "Chola",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Previous Year Policy (Backdated POI request - correction not Possible)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaPYP Details- POI or Insurer or Policy number",
        "Insurer": "Chola",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Previous Year Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaTP details",
        "Insurer": "Chola",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "TP Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaCommunication Address",
        "Insurer": "Chola",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Written consent",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaDate of Birth (DOB)",
        "Insurer": "Chola",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaEmail Address",
        "Insurer": "Chola",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "updated email id",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaMobile Number",
        "Insurer": "Chola",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "updated mobile no.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaNominee Details",
        "Insurer": "Chola",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee details ( if PA cover is added)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaSalutation",
        "Insurer": "Chola",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaOwner Driver Personal Accident",
        "Insurer": "Chola",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaPaid Driver",
        "Insurer": "Chola",
        "Requirement": "Paid Driver",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaUn Named Passanger Cover",
        "Insurer": "Chola",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaCNG Addition External",
        "Insurer": "Chola",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC and CNG Invoice Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaCNG Addition Company fitted",
        "Insurer": "Chola",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaCubic Capacity (CC)",
        "Insurer": "Chola",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Chola",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaIDV Change",
        "Insurer": "Chola",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaManufactured Date",
        "Insurer": "Chola",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaMake, Model & Variant",
        "Insurer": "Chola",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaOwnership Transfer",
        "Insurer": "Chola",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Self Financial Endt",
        "Documents or any other requirement": "RC, New owner details and Umasked Aadhar Card  ( need to raise to insurer in case of reg. no. change)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaNCB Correction (taken extra NCB)",
        "Insurer": "Chola",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy and NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaNCB Correction (taken less NCB)",
        "Insurer": "Chola",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy and NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaTop Up (PAYD plan)",
        "Insurer": "Chola",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Chola",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaPost Issuance Cancellation",
        "Insurer": "Chola",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Chola",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CholaM-Parivahan",
        "Insurer": "Chola",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajAddition of GST No.",
        "Insurer": "Bajaj",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajChassis Number",
        "Insurer": "Bajaj",
        "Requirement": "Chassis Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajColour Change",
        "Insurer": "Bajaj",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Not Possible",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajEngine Number",
        "Insurer": "Bajaj",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajHypothecation Remove",
        "Insurer": "Bajaj",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Bank NOC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajHypothecation Add",
        "Insurer": "Bajaj",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC  or Loan Sanction letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajHypothecation Change",
        "Insurer": "Bajaj",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC and Previous Bank NOC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajInsured name",
        "Insurer": "Bajaj",
        "Requirement": "Insured name",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "RC and Previous Year Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajNCB Certificate",
        "Insurer": "Bajaj",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale letter & RC (In case of vehicle sold out)\r\nRC and Customer request (If vehicle retained)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "Maybe",
        "Any Exception": "Cacellation Decalration Required : \r\nSell letter required if cx wants to cancel the policy and OD premium will be refund and Third party premium will be retained by insurer\r\nIf cx don't want to cancel the policy then NCB Recovery and inspection will be applicable (Sell letter will be required in case of OT)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajRegistration Date",
        "Insurer": "Bajaj",
        "Requirement": "Registration Date",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC  , Unmasked Aadhar card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajRegst. Number",
        "Insurer": "Bajaj",
        "Requirement": "Regst. Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Incase of State change (for eg: MH to DL), then RTO receipt will be required",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajRTO Endorsement",
        "Insurer": "Bajaj",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajSeating Capacity",
        "Insurer": "Bajaj",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC  and Unmasked Aadhar card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajPeriod of Insurance (POI)",
        "Insurer": "Bajaj",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC  ,Previous Year Policy and Unmasked Aadhar card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajPYP Details- POI or Insurer or Policy number",
        "Insurer": "Bajaj",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC  ,Previous Year Policy and Unmasked Aadhar card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajTP details",
        "Insurer": "Bajaj",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC  ,Previous Year Policy , Bundle Policy and Unmasked Aadhar card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajCommunication Address",
        "Insurer": "Bajaj",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Complete Address with Pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajDate of Birth (DOB)",
        "Insurer": "Bajaj",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajEmail Address",
        "Insurer": "Bajaj",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Email Id",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajMobile Number",
        "Insurer": "Bajaj",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Mobile No.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajNominee Details",
        "Insurer": "Bajaj",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajSalutation",
        "Insurer": "Bajaj",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Correct Salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajOwner Driver Personal Accident",
        "Insurer": "Bajaj",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC ,Driving License ,pan card and Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajPaid Driver",
        "Insurer": "Bajaj",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC ,Unmasked Aadhar card of Insured , Driving License  of Driver and 3 Months Salary slip",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajUn Named Passanger Cover",
        "Insurer": "Bajaj",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC  ,Unmasked Aadhar card   and written confirmation of coverage for Rs.50 - 1L and Rs.100/-  2L",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajCNG Addition External",
        "Insurer": "Bajaj",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC and CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajCNG Addition Company fitted",
        "Insurer": "Bajaj",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajCubic Capacity (CC)",
        "Insurer": "Bajaj",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC  and  Unmasked Aadhar card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Raise to insurer with Quote with correct cc",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Bajaj",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajIDV Change",
        "Insurer": "Bajaj",
        "Requirement": "IDV Change",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Unmasked Aadhar card and Renewal Notice (which customer receives at the time of booking)",
        "TAT": "Not Possible",
        "Charges / Deduction": "May be",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajManufactured Date",
        "Insurer": "Bajaj",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC  , Unmasked Aadhar card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajMake, Model & Variant",
        "Insurer": "Bajaj",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC  , Unmasked Aadhar card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "Maybe",
        "Any Exception": "For ticket associate: Raise to insurer with Quote with MMV",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajOwnership Transfer",
        "Insurer": "Bajaj",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC and Proposal Form",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajNCB Correction (taken extra NCB)",
        "Insurer": "Bajaj",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy and confirmation if customer has taken claim or not",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "Verbal confirmation if customer has taken claim or not",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajNCB Correction (taken less NCB)",
        "Insurer": "Bajaj",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy and confirmation if customer has taken claim or not",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajTop Up (PAYD plan)",
        "Insurer": "Bajaj",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC and Unmasked Aadhar card and written or verbal confirmation for KM (min 2,000 km & max 6,000 km)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Bajaj",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajPost Issuance Cancellation",
        "Insurer": "Bajaj",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Bajaj",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer Consent",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "BajajM-Parivahan",
        "Insurer": "Bajaj",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "No Requirement",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyAddition of GST No.",
        "Insurer": "Liberty",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyChassis Number",
        "Insurer": "Liberty",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyColour Change",
        "Insurer": "Liberty",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyEngine Number",
        "Insurer": "Liberty",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyHypothecation Remove",
        "Insurer": "Liberty",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC  ,Bank NOC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyHypothecation Add",
        "Insurer": "Liberty",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC  or Loan Sanction letter & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyHypothecation Change",
        "Insurer": "Liberty",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC  ,Previous Bank NOC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyInsured name",
        "Insurer": "Liberty",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC  , Masked Aadhar Card , pan card ,Previous Year Policy & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Will be considered as o/t incase of complete name mismatch\r\nFor Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyNCB Certificate",
        "Insurer": "Liberty",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sell letter , Previous Year Policy , NCB Confirmation and cancellation declaration",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyRegistration Date",
        "Insurer": "Liberty",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "Maybe",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyRegst. Number",
        "Insurer": "Liberty",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyRTO Endorsement",
        "Insurer": "Liberty",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertySeating Capacity",
        "Insurer": "Liberty",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyPeriod of Insurance (POI)",
        "Insurer": "Liberty",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC ,previous Year Policy & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Backdated correction not possible \r\nFor Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyPYP Details- POI or Insurer or Policy number",
        "Insurer": "Liberty",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC ,previous Year Policy & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyTP details",
        "Insurer": "Liberty",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC ,previous Year Policy ,bundle Policy  & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyCommunication Address",
        "Insurer": "Liberty",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Address Proof & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyDate of Birth (DOB)",
        "Insurer": "Liberty",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyEmail Address",
        "Insurer": "Liberty",
        "Requirement": "Email Address",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyMobile Number",
        "Insurer": "Liberty",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyNominee Details",
        "Insurer": "Liberty",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertySalutation",
        "Insurer": "Liberty",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyOwner Driver Personal Accident",
        "Insurer": "Liberty",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyPaid Driver",
        "Insurer": "Liberty",
        "Requirement": "Paid Driver",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyUn Named Passanger Cover",
        "Insurer": "Liberty",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyCNG Addition External",
        "Insurer": "Liberty",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC  , CNG Invoice & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For ticket associate: \r\nEndorsement form to be filled and raised to insurer \r\nInspection to be raised from Insurer portal (from insurer end)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyCNG Addition Company fitted",
        "Insurer": "Liberty",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyCubic Capacity (CC)",
        "Insurer": "Liberty",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Liberty",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyIDV Change",
        "Insurer": "Liberty",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyManufactured Date",
        "Insurer": "Liberty",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyMake, Model & Variant",
        "Insurer": "Liberty",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyOwnership Transfer",
        "Insurer": "Liberty",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC ,Masked Aadhar card and Pan Card  , NOC and Transfer Form (will be provided by TL / Ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For ticket associate: \r\nEndorsement form to be filled and raised to insurer \r\nInspection to be raised from Insurer portal (from insurer end)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyNCB Correction (taken extra NCB)",
        "Insurer": "Liberty",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy and written consent",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For Ticket associate: Inspection to be raised from Insurer portal (from insurer end)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyNCB Correction (taken less NCB)",
        "Insurer": "Liberty",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy  and NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "For Ticket associate: Inspection to be raised from Insurer portal (from insurer end)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyTop Up (PAYD plan)",
        "Insurer": "Liberty",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Liberty",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyPost Issuance Cancellation",
        "Insurer": "Liberty",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy and Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Liberty",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Not Possible",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "LibertyM-Parivahan",
        "Insurer": "Liberty",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalAddition of GST No.",
        "Insurer": "National",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalChassis Number",
        "Insurer": "National",
        "Requirement": "Chassis Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalColour Change",
        "Insurer": "National",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalEngine Number",
        "Insurer": "National",
        "Requirement": "Engine Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalHypothecation Remove",
        "Insurer": "National",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Bank NOC and Updated RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalHypothecation Add",
        "Insurer": "National",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC  or Loan Sanction letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalHypothecation Change",
        "Insurer": "National",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC and  Previous Bank NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalInsured name",
        "Insurer": "National",
        "Requirement": "Insured name",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC , Previous year policy, Unmasked Aadhar or pan + (Rs 60/- Charges applicable in package policy)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalNCB Certificate",
        "Insurer": "National",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Updated RC, Sell letter or RTO Receipt, PYP , NCB confirmation and cancellation declaration",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "Updated RC will not be required after policy expiry (possible on the basis of NCB confirmation letter)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalRegistration Date",
        "Insurer": "National",
        "Requirement": "Registration Date",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalRegst. Number",
        "Insurer": "National",
        "Requirement": "Regst. Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalRTO Endorsement",
        "Insurer": "National",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalSeating Capacity",
        "Insurer": "National",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalPeriod of Insurance (POI)",
        "Insurer": "National",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalPYP Details- POI or Insurer or Policy number",
        "Insurer": "National",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Previous Year Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalTP details",
        "Insurer": "National",
        "Requirement": "TP details",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Bundle Policy Required(POI not possible)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalCommunication Address",
        "Insurer": "National",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete address required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalDate of Birth (DOB)",
        "Insurer": "National",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalEmail Address",
        "Insurer": "National",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Updated Email Id",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalMobile Number",
        "Insurer": "National",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Updated mobile no.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalNominee Details",
        "Insurer": "National",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalSalutation",
        "Insurer": "National",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalOwner Driver Personal Accident",
        "Insurer": "National",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalPaid Driver",
        "Insurer": "National",
        "Requirement": "Paid Driver",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalUn Named Passanger Cover",
        "Insurer": "National",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalCNG Addition External",
        "Insurer": "National",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC and CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalCNG Addition Company fitted",
        "Insurer": "National",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalCubic Capacity (CC)",
        "Insurer": "National",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "National",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalIDV Change",
        "Insurer": "National",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalManufactured Date",
        "Insurer": "National",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalMake, Model & Variant",
        "Insurer": "National",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalOwnership Transfer",
        "Insurer": "National",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC , New owner details and Unmasked Aadhar or pan of new insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalNCB Correction (taken extra NCB)",
        "Insurer": "National",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year policy and NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalNCB Correction (taken less NCB)",
        "Insurer": "National",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year policy and NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalTop Up (PAYD plan)",
        "Insurer": "National",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "National",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalPost Issuance Cancellation",
        "Insurer": "National",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Alternate Policy , Written Consent and NEFT of insured as per policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "Alternate should be comprehensive, incase of alternate TP, the later issued policy will be cancelled",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "National",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent and Cancelled cheque  as per policy (For OD Refund  only)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "NationalM-Parivahan",
        "Insurer": "National",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "No requirement",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceAddition of GST No.",
        "Insurer": "Reliance",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured, RC &  Pan Card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction not possible in Xpas plan",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceChassis Number",
        "Insurer": "Reliance",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceColour Change",
        "Insurer": "Reliance",
        "Requirement": "Colour Change",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceEngine Number",
        "Insurer": "Reliance",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceHypothecation Remove",
        "Insurer": "Reliance",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Customer Request Letter\r\nEndorsed RC Copy / NOC from Financier",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceHypothecation Add",
        "Insurer": "Reliance",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Customer Request Letter and RC Copy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceHypothecation Change",
        "Insurer": "Reliance",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Customer Request Letter\r\n              Endorsed RC Copy / Financier letter / Sanction Letter from Financial Institute",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceInsured name",
        "Insurer": "Reliance",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC,KYC , PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceNCB Certificate",
        "Insurer": "Reliance",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale Letter and cancellation declaration",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "Inspection to be raised from Reliance portal (from insurer end)",
        "Declaration format (if declaration required)": "Please confirm from the below scenario from the customer and share information:\r\n1. In case customer want to cancel policy then alternate policy or sell proof will be required and ncb will be recovered, also refund amount will be declared as per U/W \r\n2. If customer don't want to cancel only ncb will be recovered and cx can process ownership transfer also"
    },
    {
        "InsurerRequirement": "RelianceRegistration Date",
        "Insurer": "Reliance",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceRegst. Number",
        "Insurer": "Reliance",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceRTO Endorsement",
        "Insurer": "Reliance",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceSeating Capacity",
        "Insurer": "Reliance",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ReliancePeriod of Insurance (POI)",
        "Insurer": "Reliance",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC,KYC , PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "Correction not possible in PAYD plan or Policies having same policy format as PAYD policy",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ReliancePYP Details- POI or Insurer or Policy number",
        "Insurer": "Reliance",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC,KYC , PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceTP details",
        "Insurer": "Reliance",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC,KYC , PYP and Bundle Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceCommunication Address",
        "Insurer": "Reliance",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Address Proof of insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Nil Endt incase of Xpas plan",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceDate of Birth (DOB)",
        "Insurer": "Reliance",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "NA",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceEmail Address",
        "Insurer": "Reliance",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated email id",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Nil Endt incase of Xpas plan",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceMobile Number",
        "Insurer": "Reliance",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated mobile no.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Nil Endt incase of Xpas plan",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceNominee Details",
        "Insurer": "Reliance",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Nominee ID proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Nil Endt incase of Xpas plan",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceSalutation",
        "Insurer": "Reliance",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Insured ID Proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Nil Endt incase of Xpas plan",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceOwner Driver Personal Accident",
        "Insurer": "Reliance",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ReliancePaid Driver",
        "Insurer": "Reliance",
        "Requirement": "Paid Driver",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceUn Named Passanger Cover",
        "Insurer": "Reliance",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceCNG Addition External",
        "Insurer": "Reliance",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC and CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Inspection to be raised from Reliance portal (from insurer end)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceCNG Addition Company fitted",
        "Insurer": "Reliance",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Inspection to be raised from Reliance portal (from insurer end)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceCubic Capacity (CC)",
        "Insurer": "Reliance",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Reliance",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceIDV Change",
        "Insurer": "Reliance",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceManufactured Date",
        "Insurer": "Reliance",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceMake, Model & Variant",
        "Insurer": "Reliance",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "May Be",
        "Inspection": "Maybe",
        "Any Exception": "Inspection to be raised from Reliance portal (from insurer end)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceOwnership Transfer",
        "Insurer": "Reliance",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC , NOC ,New owner details and Pa Cover declaration",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "Inspection to be raised from Reliance portal (from insurer end)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceNCB Correction (taken extra NCB)",
        "Insurer": "Reliance",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP and NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Inspection to be raised from Reliance portal (from insurer end)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceNCB Correction (taken less NCB)",
        "Insurer": "Reliance",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP and NCB Confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceTop Up (PAYD plan)",
        "Insurer": "Reliance",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Cx request from my account (Kms to top up)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Reliance",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ReliancePost Issuance Cancellation",
        "Insurer": "Reliance",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ReliancePost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Reliance",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "RelianceM-Parivahan",
        "Insurer": "Reliance",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalAddition of GST No.",
        "Insurer": "Oriental",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalChassis Number",
        "Insurer": "Oriental",
        "Requirement": "Chassis Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalColour Change",
        "Insurer": "Oriental",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalEngine Number",
        "Insurer": "Oriental",
        "Requirement": "Engine Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalHypothecation Remove",
        "Insurer": "Oriental",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "NOC Or Updated RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalHypothecation Add",
        "Insurer": "Oriental",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalHypothecation Change",
        "Insurer": "Oriental",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Updated RC and Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalInsured name",
        "Insurer": "Oriental",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP and KYC of RC owner, Customer Declaration",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": "Kindly ask the customer to share below declaration on mail: \r\n\"I certify that I have applied for the Correction in Insured name in policy no. __________________. This is not the case of Ownership transfer and there is no known or reported loss till date. I certify that the above facts are true to the best of my knowledge and if found false, I am liable for it and Insurer has the right to cancel the policy without any refund.\""
    },
    {
        "InsurerRequirement": "OrientalNCB Certificate",
        "Insurer": "Oriental",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Form 29/30\r\nor\r\nUpdated RC with transferred date",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Charges would not be required incase policy has expired",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalRegistration Date",
        "Insurer": "Oriental",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalRegst. Number",
        "Insurer": "Oriental",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Charges may be applicable incase of state / RTO code change",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalRTO Endorsement",
        "Insurer": "Oriental",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalSeating Capacity",
        "Insurer": "Oriental",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalPeriod of Insurance (POI)",
        "Insurer": "Oriental",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalPYP Details- POI or Insurer or Policy number",
        "Insurer": "Oriental",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalTP details",
        "Insurer": "Oriental",
        "Requirement": "TP details",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Third party Bundle Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalCommunication Address",
        "Insurer": "Oriental",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalDate of Birth (DOB)",
        "Insurer": "Oriental",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalEmail Address",
        "Insurer": "Oriental",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalMobile Number",
        "Insurer": "Oriental",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalNominee Details",
        "Insurer": "Oriental",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalSalutation",
        "Insurer": "Oriental",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalOwner Driver Personal Accident",
        "Insurer": "Oriental",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalPaid Driver",
        "Insurer": "Oriental",
        "Requirement": "Paid Driver",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalUn Named Passanger Cover",
        "Insurer": "Oriental",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalCNG Addition External",
        "Insurer": "Oriental",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG invoice or PYP with CNG value",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalCNG Addition Company fitted",
        "Insurer": "Oriental",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Copy and PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalCubic Capacity (CC)",
        "Insurer": "Oriental",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC charges may be applicable",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Oriental",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalIDV Change",
        "Insurer": "Oriental",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalManufactured Date",
        "Insurer": "Oriental",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalMake, Model & Variant",
        "Insurer": "Oriental",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalOwnership Transfer",
        "Insurer": "Oriental",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC, New owner detail, Customer Declaration",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Kindly ask the customer to share below declaration on mail: \r\n\"I certify that I have applied for the transfer of ownership in policy no. __________________ and there is no known or reported loss till date. I certify that the above facts are true to the best of my knowledge and if found false, I am liable for it and Insurer has the right to cancel the policy without any refund.\""
    },
    {
        "InsurerRequirement": "OrientalNCB Correction (taken extra NCB)",
        "Insurer": "Oriental",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalNCB Correction (taken less NCB)",
        "Insurer": "Oriental",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP and NCB confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalTop Up (PAYD plan)",
        "Insurer": "Oriental",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Oriental",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalPost Issuance Cancellation",
        "Insurer": "Oriental",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy, Reason and Declaration",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Not Possible",
        "Inspection": "No",
        "Any Exception": "To be raised on Mail",
        "Declaration format (if declaration required)": "Complete reason for cancellation from customer's registered email ID along with requested date and time, Declaration :- There is no claim running in the policy"
    },
    {
        "InsurerRequirement": "OrientalPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Oriental",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "OrientalM-Parivahan",
        "Insurer": "Oriental",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoAddition of GST No.",
        "Insurer": "Universal Sompo",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoChassis Number",
        "Insurer": "Universal Sompo",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoColour Change",
        "Insurer": "Universal Sompo",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoEngine Number",
        "Insurer": "Universal Sompo",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoHypothecation Remove",
        "Insurer": "Universal Sompo",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "NOC or Updated RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoHypothecation Add",
        "Insurer": "Universal Sompo",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Updated RC or Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoHypothecation Change",
        "Insurer": "Universal Sompo",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Updated RC and Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoInsured name",
        "Insurer": "Universal Sompo",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP and KYC of RC owner",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For KYC: CKYC number or PAN and Adhar will required \r\nProceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoNCB Certificate",
        "Insurer": "Universal Sompo",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale Letter or Updated RC , PYP and NCB confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoRegistration Date",
        "Insurer": "Universal Sompo",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoRegst. Number",
        "Insurer": "Universal Sompo",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoRTO Endorsement",
        "Insurer": "Universal Sompo",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoSeating Capacity",
        "Insurer": "Universal Sompo",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoPeriod of Insurance (POI)",
        "Insurer": "Universal Sompo",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoPYP Details- POI or Insurer or Policy number",
        "Insurer": "Universal Sompo",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoTP details",
        "Insurer": "Universal Sompo",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Third party Bundle Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoCommunication Address",
        "Insurer": "Universal Sompo",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoDate of Birth (DOB)",
        "Insurer": "Universal Sompo",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoEmail Address",
        "Insurer": "Universal Sompo",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoMobile Number",
        "Insurer": "Universal Sompo",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoNominee Details",
        "Insurer": "Universal Sompo",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoSalutation",
        "Insurer": "Universal Sompo",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoOwner Driver Personal Accident",
        "Insurer": "Universal Sompo",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoPaid Driver",
        "Insurer": "Universal Sompo",
        "Requirement": "Paid Driver",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoUn Named Passanger Cover",
        "Insurer": "Universal Sompo",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoCNG Addition External",
        "Insurer": "Universal Sompo",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Kit invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoCNG Addition Company fitted",
        "Insurer": "Universal Sompo",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Copy, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoCubic Capacity (CC)",
        "Insurer": "Universal Sompo",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Universal Sompo",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoIDV Change",
        "Insurer": "Universal Sompo",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoManufactured Date",
        "Insurer": "Universal Sompo",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoMake, Model & Variant",
        "Insurer": "Universal Sompo",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoOwnership Transfer",
        "Insurer": "Universal Sompo",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC, New owner detail",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "For KYC: CKYC number or PAN and Adhar will required",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoNCB Correction (taken extra NCB)",
        "Insurer": "Universal Sompo",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP & NCB confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoNCB Correction (taken less NCB)",
        "Insurer": "Universal Sompo",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP & NCB confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoTop Up (PAYD plan)",
        "Insurer": "Universal Sompo",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Kilometers to be top up",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Odometer only inspection required",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Universal Sompo",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Not Possible",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoPost Issuance Cancellation",
        "Insurer": "Universal Sompo",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy (should be updated on vahan)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Universal Sompo",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "Universal SompoM-Parivahan",
        "Insurer": "Universal Sompo",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramAddition of GST No.",
        "Insurer": "Shriram",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible only on the same month of booking (For eg: Booking date is 27th Jan, correction only possible till 31st Jan)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramChassis Number",
        "Insurer": "Shriram",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramColour Change",
        "Insurer": "Shriram",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramEngine Number",
        "Insurer": "Shriram",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramHypothecation Remove",
        "Insurer": "Shriram",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "NOC and updated RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramHypothecation Add",
        "Insurer": "Shriram",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Updated RC or Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramHypothecation Change",
        "Insurer": "Shriram",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Updated RC or Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramInsured name",
        "Insurer": "Shriram",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP and KYC(Aadhaar & Pan)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramNCB Certificate",
        "Insurer": "Shriram",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale Letter and Updated RC or form 29 and 30 with rto stamp , PYP and NCB confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "For ticketing associate: Need to raise on mail",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramRegistration Date",
        "Insurer": "Shriram",
        "Requirement": "Registration Date",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramRegst. Number",
        "Insurer": "Shriram",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramRTO Endorsement",
        "Insurer": "Shriram",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramSeating Capacity",
        "Insurer": "Shriram",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Commercial - If seating capacity is incorrectly mentioned and the customer requests a correction where the seating capacity is above 7, corrections is not possible as per insurer, need to proceed with cancellation",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramPeriod of Insurance (POI)",
        "Insurer": "Shriram",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramPYP Details- POI or Insurer or Policy number",
        "Insurer": "Shriram",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramTP details",
        "Insurer": "Shriram",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Third party Bundle Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramCommunication Address",
        "Insurer": "Shriram",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramDate of Birth (DOB)",
        "Insurer": "Shriram",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramEmail Address",
        "Insurer": "Shriram",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramMobile Number",
        "Insurer": "Shriram",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramNominee Details",
        "Insurer": "Shriram",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramSalutation",
        "Insurer": "Shriram",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramOwner Driver Personal Accident",
        "Insurer": "Shriram",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Copy, Nominee detail. DL",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramPaid Driver",
        "Insurer": "Shriram",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, DL of driver, Salary slip or bank statement",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramUn Named Passanger Cover",
        "Insurer": "Shriram",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & confirmation from cx if he wants to opt Rs 50/seat or Rs 100/seat",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramCNG Addition External",
        "Insurer": "Shriram",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC copy, CNG Kit invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramCNG Addition Company fitted",
        "Insurer": "Shriram",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Copy, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramCubic Capacity (CC)",
        "Insurer": "Shriram",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Shriram",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramIDV Change",
        "Insurer": "Shriram",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramManufactured Date",
        "Insurer": "Shriram",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramMake, Model & Variant",
        "Insurer": "Shriram",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramOwnership Transfer",
        "Insurer": "Shriram",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC, New owner detail, RC transfer Date, New Owner's father name",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "KYC - Pan and Aadhar card mandatory",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramNCB Correction (taken extra NCB)",
        "Insurer": "Shriram",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP & NCB confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramNCB Correction (taken less NCB)",
        "Insurer": "Shriram",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP & NCB confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramTop Up (PAYD plan)",
        "Insurer": "Shriram",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Confirmation from the customer if he/she is okay with Plan update to normal",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Top up not possible, plan can be changed from PAYD to regular",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Shriram",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramPost Issuance Cancellation",
        "Insurer": "Shriram",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy along with customer consent",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Shriram",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ShriramM-Parivahan",
        "Insurer": "Shriram",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakAddition of GST No.",
        "Insurer": "Kotak",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakChassis Number",
        "Insurer": "Kotak",
        "Requirement": "Chassis Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakColour Change",
        "Insurer": "Kotak",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakEngine Number",
        "Insurer": "Kotak",
        "Requirement": "Engine Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakHypothecation Remove",
        "Insurer": "Kotak",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "NOC or Updated RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakHypothecation Add",
        "Insurer": "Kotak",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC or Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakHypothecation Change",
        "Insurer": "Kotak",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated RC and Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakInsured name",
        "Insurer": "Kotak",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP and KYC of RC owner",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar (If CKYC not done) \r\nProceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakNCB Certificate",
        "Insurer": "Kotak",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale Letter or Updated RC , PYP and NCB confirmation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakRegistration Date",
        "Insurer": "Kotak",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakRegst. Number",
        "Insurer": "Kotak",
        "Requirement": "Regst. Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakRTO Endorsement",
        "Insurer": "Kotak",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakSeating Capacity",
        "Insurer": "Kotak",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakPeriod of Insurance (POI)",
        "Insurer": "Kotak",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakPYP Details- POI or Insurer or Policy number",
        "Insurer": "Kotak",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakTP details",
        "Insurer": "Kotak",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Third party Bundle Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakCommunication Address",
        "Insurer": "Kotak",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakDate of Birth (DOB)",
        "Insurer": "Kotak",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakEmail Address",
        "Insurer": "Kotak",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Complete Email ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakMobile Number",
        "Insurer": "Kotak",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakNominee Details",
        "Insurer": "Kotak",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee Details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakSalutation",
        "Insurer": "Kotak",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "correct salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakOwner Driver Personal Accident",
        "Insurer": "Kotak",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Copy, Nominee detail. DL",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Endt possible before policy start date \r\n PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakPaid Driver",
        "Insurer": "Kotak",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, DL of driver, Salary slip or bank statement",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Endt possible before policy start date \r\n PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakUn Named Passanger Cover",
        "Insurer": "Kotak",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & confirmation from cx if he wants to opt Rs 50/seat or Rs 100/seat",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Endt possible before policy start date \r\n PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakCNG Addition External",
        "Insurer": "Kotak",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC & CNG Kit invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakCNG Addition Company fitted",
        "Insurer": "Kotak",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Copy ,PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakCubic Capacity (CC)",
        "Insurer": "Kotak",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "Kotak",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakIDV Change",
        "Insurer": "Kotak",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakManufactured Date",
        "Insurer": "Kotak",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakMake, Model & Variant",
        "Insurer": "Kotak",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakOwnership Transfer",
        "Insurer": "Kotak",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, KYC, New owner detail",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakNCB Correction (taken extra NCB)",
        "Insurer": "Kotak",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP & NCB confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakNCB Correction (taken less NCB)",
        "Insurer": "Kotak",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "PYP & NCB confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakTop Up (PAYD plan)",
        "Insurer": "Kotak",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "Kotak",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakPost Issuance Cancellation",
        "Insurer": "Kotak",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "Kotak",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "KotakM-Parivahan",
        "Insurer": "Kotak",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "PAN and Masked Adhar card is required ( If CKYC not done)",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCAddition of GST No.",
        "Insurer": "HDFC",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCChassis Number",
        "Insurer": "HDFC",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCColour Change",
        "Insurer": "HDFC",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCEngine Number",
        "Insurer": "HDFC",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCHypothecation Remove",
        "Insurer": "HDFC",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC and NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCHypothecation Add",
        "Insurer": "HDFC",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCHypothecation Change",
        "Insurer": "HDFC",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC and NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCInsured name",
        "Insurer": "HDFC",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, Pehchaan ID, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": "Pehchan ID link: https://pehchaan.hdfcergo.com/"
    },
    {
        "InsurerRequirement": "HDFCNCB Certificate",
        "Insurer": "HDFC",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale Letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCRegistration Date",
        "Insurer": "HDFC",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCRegst. Number",
        "Insurer": "HDFC",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCRTO Endorsement",
        "Insurer": "HDFC",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCSeating Capacity",
        "Insurer": "HDFC",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCPeriod of Insurance (POI)",
        "Insurer": "HDFC",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCPYP Details- POI or Insurer or Policy number",
        "Insurer": "HDFC",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCTP details",
        "Insurer": "HDFC",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "TP Bundle Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCCommunication Address",
        "Insurer": "HDFC",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Address Proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCDate of Birth (DOB)",
        "Insurer": "HDFC",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "DOB proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCEmail Address",
        "Insurer": "HDFC",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "New Mail ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCMobile Number",
        "Insurer": "HDFC",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "New Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCNominee Details",
        "Insurer": "HDFC",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCSalutation",
        "Insurer": "HDFC",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Customer Request",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCOwner Driver Personal Accident",
        "Insurer": "HDFC",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, DL and Nominee details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCPaid Driver",
        "Insurer": "HDFC",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "DL, 3 months Salary slip of driver.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCUn Named Passanger Cover",
        "Insurer": "HDFC",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Copy along with confirmation of 1Lac/2Lacs per seat coverage addition.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCCNG Addition External",
        "Insurer": "HDFC",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCCNG Addition Company fitted",
        "Insurer": "HDFC",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCCubic Capacity (CC)",
        "Insurer": "HDFC",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "HDFC",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCIDV Change",
        "Insurer": "HDFC",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCManufactured Date",
        "Insurer": "HDFC",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCMake, Model & Variant",
        "Insurer": "HDFC",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCOwnership Transfer",
        "Insurer": "HDFC",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PA Declaration form in pdf (available with ticketing team),pehchaan id, New owner details.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": "Pehchan ID link: https://pehchaan.hdfcergo.com/"
    },
    {
        "InsurerRequirement": "HDFCNCB Correction (taken extra NCB)",
        "Insurer": "HDFC",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCNCB Correction (taken less NCB)",
        "Insurer": "HDFC",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy,",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCTop Up (PAYD plan)",
        "Insurer": "HDFC",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "HDFC",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, PYP AND KYC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCPost Issuance Cancellation",
        "Insurer": "HDFC",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate and KYC Documents along with NEFT details (NEFT required in only in 2W policies)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "HDFC",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "HDFCM-Parivahan",
        "Insurer": "HDFC",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "No Requirement",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIAddition of GST No.",
        "Insurer": "ICICI",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIChassis Number",
        "Insurer": "ICICI",
        "Requirement": "Chassis Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIColour Change",
        "Insurer": "ICICI",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIEngine Number",
        "Insurer": "ICICI",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIHypothecation Remove",
        "Insurer": "ICICI",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIHypothecation Add",
        "Insurer": "ICICI",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Updated Rc or Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIHypothecation Change",
        "Insurer": "ICICI",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Updated Rc or Loan Sanction Letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIInsured name",
        "Insurer": "ICICI",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC,PYP, Aadhaar Card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICINCB Certificate",
        "Insurer": "ICICI",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale Letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIRegistration Date",
        "Insurer": "ICICI",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIRegst. Number",
        "Insurer": "ICICI",
        "Requirement": "Regst. Number",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIRTO Endorsement",
        "Insurer": "ICICI",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICISeating Capacity",
        "Insurer": "ICICI",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIPeriod of Insurance (POI)",
        "Insurer": "ICICI",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Previous Year Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIPYP Details- POI or Insurer or Policy number",
        "Insurer": "ICICI",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Previous Year Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICITP details",
        "Insurer": "ICICI",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Bundled TP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICICommunication Address",
        "Insurer": "ICICI",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Address with Pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIDate of Birth (DOB)",
        "Insurer": "ICICI",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "DOB proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIEmail Address",
        "Insurer": "ICICI",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Email Id",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIMobile Number",
        "Insurer": "ICICI",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICINominee Details",
        "Insurer": "ICICI",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICISalutation",
        "Insurer": "ICICI",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Customer Written Consent (By Mail or My Account)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIOwner Driver Personal Accident",
        "Insurer": "ICICI",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, DL and Nominee details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Addition possible only before policy start date (Post policy start date will suggest customer to take separate PA through ICICI website)\r\nCustomer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIPaid Driver",
        "Insurer": "ICICI",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "DL, 3 months Salary slip of driver",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Addition possible only before policy start date\r\nCustomer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIUn Named Passanger Cover",
        "Insurer": "ICICI",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Copy and Written consent from Customer along with confirmation of 1Lac/2Lacs per seat coverage addition.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Addition possible only before policy start date\r\nCustomer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICICNG Addition External",
        "Insurer": "ICICI",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice/PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICICNG Addition Company fitted",
        "Insurer": "ICICI",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICICubic Capacity (CC)",
        "Insurer": "ICICI",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "ICICI",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIIDV Change",
        "Insurer": "ICICI",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIManufactured Date",
        "Insurer": "ICICI",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIMake, Model & Variant",
        "Insurer": "ICICI",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIOwnership Transfer",
        "Insurer": "ICICI",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, Aadhaar Card and Pan Card (New owner), New owner details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICINCB Correction (taken extra NCB)",
        "Insurer": "ICICI",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy, NCB Confirmation letter from pyp insurer",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICINCB Correction (taken less NCB)",
        "Insurer": "ICICI",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy, NCB Confirmation letter from pyp insurer",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICITop Up (PAYD plan)",
        "Insurer": "ICICI",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Customer Written Consent (By Mail or My Account)\r\nIf the initial purchase KM limit is exhausted, a complete inspection is required.\r\nIf not, an odometer photo must be collected from the customer while raising the request to the insurer.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "ICICI",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Reg. date and MMV needs to be correct, then only correction is possible - RC required & Customer Consent",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIPost Issuance Cancellation",
        "Insurer": "ICICI",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "ICICI",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "If Reg. date and MMV need to be correct, then only correction is possible - Alternate policy, RC required & Customer Consent",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Customer request for endorsement mandatory - Please ask the customer to share written consent",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "ICICIM-Parivahan",
        "Insurer": "ICICI",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC and written consent Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIAddition of GST No.",
        "Insurer": "SBI",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIChassis Number",
        "Insurer": "SBI",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIColour Change",
        "Insurer": "SBI",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIEngine Number",
        "Insurer": "SBI",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIHypothecation Remove",
        "Insurer": "SBI",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIHypothecation Add",
        "Insurer": "SBI",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIHypothecation Change",
        "Insurer": "SBI",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIInsured name",
        "Insurer": "SBI",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC with Owner serial no 1 and PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Incase of O.sno above 1 or pyp unavailibility - case to be considered as O/t",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBINCB Certificate",
        "Insurer": "SBI",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card, Sale Letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIRegistration Date",
        "Insurer": "SBI",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIRegst. Number",
        "Insurer": "SBI",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIRTO Endorsement",
        "Insurer": "SBI",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBISeating Capacity",
        "Insurer": "SBI",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIPeriod of Insurance (POI)",
        "Insurer": "SBI",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card along with Previous year policy copy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIPYP Details- POI or Insurer or Policy number",
        "Insurer": "SBI",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card along with Previous year policy copy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBITP details",
        "Insurer": "SBI",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card along with Bundled policy copy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBICommunication Address",
        "Insurer": "SBI",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Address with Pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIDate of Birth (DOB)",
        "Insurer": "SBI",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIEmail Address",
        "Insurer": "SBI",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Email Id",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIMobile Number",
        "Insurer": "SBI",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBINominee Details",
        "Insurer": "SBI",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBISalutation",
        "Insurer": "SBI",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Correct Salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIOwner Driver Personal Accident",
        "Insurer": "SBI",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIPaid Driver",
        "Insurer": "SBI",
        "Requirement": "Paid Driver",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIUn Named Passanger Cover",
        "Insurer": "SBI",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBICNG Addition External",
        "Insurer": "SBI",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card, RC, CNG Invoice or Pyp",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBICNG Addition Company fitted",
        "Insurer": "SBI",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card, RC and PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBICubic Capacity (CC)",
        "Insurer": "SBI",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "SBI",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIIDV Change",
        "Insurer": "SBI",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIManufactured Date",
        "Insurer": "SBI",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIMake, Model & Variant",
        "Insurer": "SBI",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card and RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIOwnership Transfer",
        "Insurer": "SBI",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PA Declaration (written confirmation if customer wants to add or not), Aadhaar Card and Pan Card (New owner), New owner details and Proposal Form (Available on MyAccount)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBINCB Correction (taken extra NCB)",
        "Insurer": "SBI",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Aadhaar and Pan Card, Previous Year Policy, NCB Confirmation letter from pyp insurer",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBINCB Correction (taken less NCB)",
        "Insurer": "SBI",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy, NCB Confirmation letter from pyp insurer",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBITop Up (PAYD plan)",
        "Insurer": "SBI",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "SBI",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIPost Issuance Cancellation",
        "Insurer": "SBI",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Aadhaar and Pan Card and Alternate policy",
        "TAT": "",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "can only be canceled if the period of insurance (POI) of the alternate policy is exactly the same as the current policy\r\n\r\nThird Party cancellation - Can be cancelled on the basis of comprehensive with no POI condition",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "SBI",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "SBIM-Parivahan",
        "Insurer": "SBI",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "RC, Unmasked Aadhar and Pan card Required",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGAddition of GST No.",
        "Insurer": "TATA AIG",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGChassis Number",
        "Insurer": "TATA AIG",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGColour Change",
        "Insurer": "TATA AIG",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGEngine Number",
        "Insurer": "TATA AIG",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGHypothecation Remove",
        "Insurer": "TATA AIG",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGHypothecation Add",
        "Insurer": "TATA AIG",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGHypothecation Change",
        "Insurer": "TATA AIG",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGInsured name",
        "Insurer": "TATA AIG",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, Aadhaar & Pan card, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Proceed with O/t incase cx doesn't have PYP",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGNCB Certificate",
        "Insurer": "TATA AIG",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale Letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGRegistration Date",
        "Insurer": "TATA AIG",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGRegst. Number",
        "Insurer": "TATA AIG",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGRTO Endorsement",
        "Insurer": "TATA AIG",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGSeating Capacity",
        "Insurer": "TATA AIG",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGPeriod of Insurance (POI)",
        "Insurer": "TATA AIG",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGPYP Details- POI or Insurer or Policy number",
        "Insurer": "TATA AIG",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGTP details",
        "Insurer": "TATA AIG",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "TP Bundle Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGCommunication Address",
        "Insurer": "TATA AIG",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Address Proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGDate of Birth (DOB)",
        "Insurer": "TATA AIG",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "DOB proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGEmail Address",
        "Insurer": "TATA AIG",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "New Mail ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGMobile Number",
        "Insurer": "TATA AIG",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "New Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGNominee Details",
        "Insurer": "TATA AIG",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Nominee details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGSalutation",
        "Insurer": "TATA AIG",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Correct Salutation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGOwner Driver Personal Accident",
        "Insurer": "TATA AIG",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, DL and Nominee details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGPaid Driver",
        "Insurer": "TATA AIG",
        "Requirement": "Paid Driver",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "DL, 3 months Salary slip of driver.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGUn Named Passanger Cover",
        "Insurer": "TATA AIG",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC Copy along with confirmation of 1Lac/2Lacs per seat coverage addition.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGCNG Addition External",
        "Insurer": "TATA AIG",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice/PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGCNG Addition Company fitted",
        "Insurer": "TATA AIG",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGCubic Capacity (CC)",
        "Insurer": "TATA AIG",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "TATA AIG",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGIDV Change",
        "Insurer": "TATA AIG",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGManufactured Date",
        "Insurer": "TATA AIG",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGMake, Model & Variant",
        "Insurer": "TATA AIG",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGOwnership Transfer",
        "Insurer": "TATA AIG",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, Aadhaar Card and Pan Card (New owner), New owner details.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGNCB Correction (taken extra NCB)",
        "Insurer": "TATA AIG",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy, NCB Confirmation letter from pyp insurer",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGNCB Correction (taken less NCB)",
        "Insurer": "TATA AIG",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy, NCB Confirmation letter from pyp insurer",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGTop Up (PAYD plan)",
        "Insurer": "TATA AIG",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "TATA AIG",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGPost Issuance Cancellation",
        "Insurer": "TATA AIG",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate policy and Written consent from Customer",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "TATA AIG",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "",
        "Documents or any other requirement": "Customer consent & Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "",
        "Any Exception": "Only third Party policy cannot be cancelled\r\n\r\nFor comprehensive: TP (Third Party) amount will be retained, and the OD (Own Damage) part will be refunded based on the usage of the policy.",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "TATA AIGM-Parivahan",
        "Insurer": "TATA AIG",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "No requirement",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedAddition of GST No.",
        "Insurer": "United",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedChassis Number",
        "Insurer": "United",
        "Requirement": "Chassis Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedColour Change",
        "Insurer": "United",
        "Requirement": "Colour Change",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedEngine Number",
        "Insurer": "United",
        "Requirement": "Engine Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedHypothecation Remove",
        "Insurer": "United",
        "Requirement": "Hypothecation Remove",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC and NOC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedHypothecation Add",
        "Insurer": "United",
        "Requirement": "Hypothecation Add",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC and Loan letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedHypothecation Change",
        "Insurer": "United",
        "Requirement": "Hypothecation Change",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC and Loan letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedInsured name",
        "Insurer": "United",
        "Requirement": "Insured name",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC and PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedNCB Certificate",
        "Insurer": "United",
        "Requirement": "NCB Certificate",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Sale Letter, PYP, NCB Confirmation letter",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedRegistration Date",
        "Insurer": "United",
        "Requirement": "Registration Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedRegst. Number",
        "Insurer": "United",
        "Requirement": "Regst. Number",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "Maybe",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedRTO Endorsement",
        "Insurer": "United",
        "Requirement": "RTO Endorsement",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedSeating Capacity",
        "Insurer": "United",
        "Requirement": "Seating Capacity",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedPeriod of Insurance (POI)",
        "Insurer": "United",
        "Requirement": "Period of Insurance (POI)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "In TP, correction is only possible if previous year policy is also TP from United",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedPYP Details- POI or Insurer or Policy number",
        "Insurer": "United",
        "Requirement": "PYP Details- POI or Insurer or Policy number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedTP details",
        "Insurer": "United",
        "Requirement": "TP details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "TP Bundle Policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedCommunication Address",
        "Insurer": "United",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "New Address with pincode",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedDate of Birth (DOB)",
        "Insurer": "United",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "DOB proof",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedEmail Address",
        "Insurer": "United",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "New Mail ID",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedMobile Number",
        "Insurer": "United",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "New Mobile Number",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedNominee Details",
        "Insurer": "United",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedSalutation",
        "Insurer": "United",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Salutation details",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedOwner Driver Personal Accident",
        "Insurer": "United",
        "Requirement": "Owner Driver Personal Accident",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedPaid Driver",
        "Insurer": "United",
        "Requirement": "Paid Driver",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedUn Named Passanger Cover",
        "Insurer": "United",
        "Requirement": "Un Named Passanger Cover",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedCNG Addition External",
        "Insurer": "United",
        "Requirement": "CNG Addition External",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, CNG Invoice",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedCNG Addition Company fitted",
        "Insurer": "United",
        "Requirement": "CNG Addition Company fitted",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC, PYP",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedCubic Capacity (CC)",
        "Insurer": "United",
        "Requirement": "Cubic Capacity (CC)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedFuel Type (Petrol - Diesel, Diesel - petrol)",
        "Insurer": "United",
        "Requirement": "Fuel Type (Petrol - Diesel, Diesel - petrol)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedIDV Change",
        "Insurer": "United",
        "Requirement": "IDV Change",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedManufactured Date",
        "Insurer": "United",
        "Requirement": "Manufactured Date",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedMake, Model & Variant",
        "Insurer": "United",
        "Requirement": "Make, Model & Variant",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Maybe",
        "Inspection": "No",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedOwnership Transfer",
        "Insurer": "United",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "RC and New owner details.",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedNCB Correction (taken extra NCB)",
        "Insurer": "United",
        "Requirement": "NCB Correction (taken extra NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy, NCB Confirmation letter from pyp insurer",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Yes",
        "Inspection": "Yes",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedNCB Correction (taken less NCB)",
        "Insurer": "United",
        "Requirement": "NCB Correction (taken less NCB)",
        "Endorsement type": "Financial Endt",
        "Documents or any other requirement": "Previous Year Policy, NCB Confirmation letter from pyp insurer",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Refund",
        "Inspection": "Yes",
        "Any Exception": "Correction possible after policy start date",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedTop Up (PAYD plan)",
        "Insurer": "United",
        "Requirement": "Top Up (PAYD plan)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedMultiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Insurer": "United",
        "Requirement": "Multiple Mismatch (Reg no, chassis no & Engine no mismatch)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedPost Issuance Cancellation",
        "Insurer": "United",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "For Non New Car - Alternate and Written Declaration from Customer (in the required format)\r\nFor New Car - \r\n1. Where policy has started - No cancellation will be done for UIIC where policies have started for brand new cases. UIIC will retain TP of 1 year and cancel policy remaining OD (pro rata/short period basis)\r\n2. where policy has not started -  Cancelled invoice of non-delivered vehicle\r\n    - Dealer declaration of non-delivery with reason and date along with Vehicle Inspection (Need to show same day Newspaper in the video)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "Non brand New Car:\r\nComprehensive policies can only be cancelled by Comprehensive/TP policy (Alternate insurer applicable, with policy same start date & time or before UIIC policy).\r\nSAOD policy cancellation: Alteranate bundle policy required\r\nTP cancellation - Alternate comprehensive/TP should be from UIIC",
        "Declaration format (if declaration required)": "I request for cancellation of policy no. _____________________.\r\n I declare that my vehicle no: ___________ is not involved in any kind of TP Damage(Property/life) & no OD claim has been intimated under Policy No: _____________________ (of United India Insurance, purchased through policy bazaar )also i confirm that i will not take any claim under this policy & i will be liable for any third party claim within this policy.\r\n I declare that the alternate policy no. ____________________ is an active policy.\""
    },
    {
        "InsurerRequirement": "UnitedPost Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Insurer": "United",
        "Requirement": "Post Issuance Cancellation (Multiple Mismatch - Reg no, chassis no & Engine no mismatch",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "UnitedM-Parivahan",
        "Insurer": "United",
        "Requirement": "M-Parivahan",
        "Endorsement type": "NA",
        "Documents or any other requirement": "No requirement",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "",
        "Inspection": "",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - KotakInsured name",
        "Insurer": "CPA - Kotak",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, DL, Aadhaar & PAN",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - KotakCommunication Address",
        "Insurer": "CPA - Kotak",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar, PAN & Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - KotakNominee Details",
        "Insurer": "CPA - Kotak",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar & PAN of insured person & Nominee details (Name, DOB, Relation)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - KotakDate of Birth (DOB)",
        "Insurer": "CPA - Kotak",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar & PAN",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - KotakSalutation",
        "Insurer": "CPA - Kotak",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar & PAN",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - KotakMobile Number",
        "Insurer": "CPA - Kotak",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar & PAN",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - KotakEmail Address",
        "Insurer": "CPA - Kotak",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Aadhaar & PAN",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - KotakAddition of GST No.",
        "Insurer": "CPA - Kotak",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non-Financial Endorsement",
        "Documents or any other requirement": "GST Certificate in the name of Insured\r\nKYC Documents (Aadhaar Card and PAN Card)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - KotakOwnership Transfer",
        "Insurer": "CPA - Kotak",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - KotakVehicle Details",
        "Insurer": "CPA - Kotak",
        "Requirement": "Vehicle Details",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - KotakPost Issuance Cancellation",
        "Insurer": "CPA - Kotak",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Within Freelook period: Reason for cancellation & Aadhaar and PAN\r\nPost Free look period: Alternate policy & Reason for cancellation & Aadhaar and PAN",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "Provides freelook period of 15 Days from the policy start date, deductions are done post free look up period",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - CholaInsured name",
        "Insurer": "CPA - Chola",
        "Requirement": "Insured name",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC, DL & KYC (Masked Aadhaar / DL / Voter Card / Passport / PAN Card)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Only spelling mistake correction possible, complete name cannot be endorsed",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - CholaCommunication Address",
        "Insurer": "CPA - Chola",
        "Requirement": "Communication Address",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Masked Aadhaar / DL / Voter Card / Passport",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - CholaNominee Details",
        "Insurer": "CPA - Chola",
        "Requirement": "Nominee Details",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Nominee's KYC (Masked Aadhaar / DL / Voter Card / Passport / Pan) & Nominee details (Name, DOB, Relation)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - CholaDate of Birth (DOB)",
        "Insurer": "CPA - Chola",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Nominee's KYC (Masked Aadhaar / DL / Voter Card / Passport / Pan) & Correct DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - CholaSalutation",
        "Insurer": "CPA - Chola",
        "Requirement": "Salutation",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Masked Aadhaar / DL / Voter Card / Passport / Pan",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - CholaMobile Number",
        "Insurer": "CPA - Chola",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - CholaEmail Address",
        "Insurer": "CPA - Chola",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - CholaAddition of GST No.",
        "Insurer": "CPA - Chola",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - CholaOwnership Transfer",
        "Insurer": "CPA - Chola",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - CholaVehicle Details",
        "Insurer": "CPA - Chola",
        "Requirement": "Vehicle Details",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - CholaPost Issuance Cancellation",
        "Insurer": "CPA - Chola",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - RelianceInsured name",
        "Insurer": "CPA - Reliance",
        "Requirement": "Insured name",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "RC, DL & KYC (Masked Aadhaar / DL / Voter Card / Passport / PAN Card) as per base policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - RelianceCommunication Address",
        "Insurer": "CPA - Reliance",
        "Requirement": "Communication Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - RelianceNominee Details",
        "Insurer": "CPA - Reliance",
        "Requirement": "Nominee Details",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Nominee details (Name, DOB, Relation) & Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - RelianceDate of Birth (DOB)",
        "Insurer": "CPA - Reliance",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Self Endt",
        "Documents or any other requirement": "Nominee's KYC (Masked Aadhaar / DL / Voter Card / Passport / Pan) & Correct DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - RelianceSalutation",
        "Insurer": "CPA - Reliance",
        "Requirement": "Salutation",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - RelianceMobile Number",
        "Insurer": "CPA - Reliance",
        "Requirement": "Mobile Number",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - RelianceEmail Address",
        "Insurer": "CPA - Reliance",
        "Requirement": "Email Address",
        "Endorsement type": "Nil Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - RelianceAddition of GST No.",
        "Insurer": "CPA - Reliance",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - RelianceOwnership Transfer",
        "Insurer": "CPA - Reliance",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - RelianceVehicle Details",
        "Insurer": "CPA - Reliance",
        "Requirement": "Vehicle Details",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - ReliancePost Issuance Cancellation",
        "Insurer": "CPA - Reliance",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "Provides freelook period of 30 Days from the policy start date, deductions are done post free look up period",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - BajajInsured name",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, DL & KYC (Masked Aadhaar / DL / Voter Card / Passport / PAN Card) as per base policy",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - BajajCommunication Address",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - BajajNominee Details",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Nominee details (Name, DOB, Relation) & Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - BajajDate of Birth (DOB)",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Correct DOB - Customer's consent / Written consent",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - BajajSalutation",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - BajajMobile Number",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - BajajEmail Address",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - BajajAddition of GST No.",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non-Financial Endorsement",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - BajajOwnership Transfer",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - BajajVehicle Details",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Vehicle Details",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - BajajPost Issuance Cancellation",
        "Insurer": "CPA - Bajaj",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Reason for cancellation (like don’t have DL / don’t drive etc.),& Alternate policy (if customer has an alternate policy)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "Provides freelook period of 15 Days from the policy start date, deductions are done post free look up period",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - DigitInsured name",
        "Insurer": "CPA - Digit",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, DL & Written Consent via App/Email & Nominee’s DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "Only spelling mistake correction possible, complete name cannot be endorsed",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - DigitCommunication Address",
        "Insurer": "CPA - Digit",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Written Consent via App/Email & Nominee’s DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - DigitNominee Details",
        "Insurer": "CPA - Digit",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Written Consent via App/Email & Nominee Details (Name, DOB & Relation)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - DigitDate of Birth (DOB)",
        "Insurer": "CPA - Digit",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Written Consent via App/Email & Nominee’s DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - DigitSalutation",
        "Insurer": "CPA - Digit",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Written Consent via App/Email & Nominee’s DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - DigitMobile Number",
        "Insurer": "CPA - Digit",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Written Consent via App/Email & Nominee’s DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - DigitEmail Address",
        "Insurer": "CPA - Digit",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Written Consent via App/Email & Nominee’s DOB",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - DigitAddition of GST No.",
        "Insurer": "CPA - Digit",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non-Financial Endorsement",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - DigitOwnership Transfer",
        "Insurer": "CPA - Digit",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - DigitVehicle Details",
        "Insurer": "CPA - Digit",
        "Requirement": "Vehicle Details",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - DigitPost Issuance Cancellation",
        "Insurer": "CPA - Digit",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Alternate policy & Reason for cancellation",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - LibertyInsured name",
        "Insurer": "CPA - Liberty",
        "Requirement": "Insured name",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "RC, DL, KYC & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - LibertyCommunication Address",
        "Insurer": "CPA - Liberty",
        "Requirement": "Communication Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Address Proof (KYC Doc) and Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - LibertyNominee Details",
        "Insurer": "CPA - Liberty",
        "Requirement": "Nominee Details",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Nominee Details (Name, DOB & Relation and Nominee’s KYC docs.) & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - LibertyDate of Birth (DOB)",
        "Insurer": "CPA - Liberty",
        "Requirement": "Date of Birth (DOB)",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - LibertySalutation",
        "Insurer": "CPA - Liberty",
        "Requirement": "Salutation",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Written Consent via App/Email, KYC Docs  & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - LibertyMobile Number",
        "Insurer": "CPA - Liberty",
        "Requirement": "Mobile Number",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Written Consent via App/Email, KYC Docs  & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - LibertyEmail Address",
        "Insurer": "CPA - Liberty",
        "Requirement": "Email Address",
        "Endorsement type": "Non Financial Endt",
        "Documents or any other requirement": "Written Consent via App/Email, KYC Docs  & Endorsement form (will be provided by TL / ticketing team)",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "For Ticket associate: Endorsement form to be filled and raised to insurer",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - LibertyAddition of GST No.",
        "Insurer": "CPA - Liberty",
        "Requirement": "Addition of GST No.",
        "Endorsement type": "Non-Financial Endorsement",
        "Documents or any other requirement": "GST Certificate in the name of Insured",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "No",
        "Inspection": "No",
        "Any Exception": "",
        "Declaration format (if declaration required)": ""
    },
    {
        "InsurerRequirement": "CPA - LibertyOwnership Transfer",
        "Insurer": "CPA - Liberty",
        "Requirement": "Ownership Transfer",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - LibertyVehicle Details",
        "Insurer": "CPA - Liberty",
        "Requirement": "Vehicle Details",
        "Endorsement type": "Not Possible",
        "Documents or any other requirement": "Not Possible",
        "TAT": "Not Possible",
        "Charges / Deduction": "Not Possible",
        "Inspection": "Not Possible",
        "Any Exception": "Not Possible",
        "Declaration format (if declaration required)": "Not Possible"
    },
    {
        "InsurerRequirement": "CPA - LibertyPost Issuance Cancellation",
        "Insurer": "CPA - Liberty",
        "Requirement": "Post Issuance Cancellation",
        "Endorsement type": "",
        "Documents or any other requirement": "Endorsement form (will be provided by TL / ticketing team) & Consent via App/Email/Call - Remarks on BMS",
        "TAT": "SRS / 10 Days",
        "Charges / Deduction": "Deduction",
        "Inspection": "No",
        "Any Exception": "Provides freelook period of 15 Days from the policy start date, deductions are done post free look up period",
        "Declaration format (if declaration required)": ""
    }
];
// Populate insurer dropdown for Endorsement
try {
    const insurers = [...new Set(endorsementData.map(d => d["Insurer"]))].sort();
    insurers.forEach(ins => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = ins;
        insurerDropdown.appendChild(opt);
    });
} catch (error) {
    console.error("Error populating insurers for endorsement:", error);
    showMessage("Error in endorsement JSON data. Please check the syntax and paste valid JSON.", "error");
}

// Handle insurer selection for endorsement
insurerDropdown.addEventListener("change", () => {
    requirementDropdown.innerHTML = "<option disabled selected>Select Requirement</option>";
    outputBox.style.display = "none";
    outputBox.classList.remove("show", "output-red");
    const selectedInsurer = insurerDropdown.value;
    const requirements = [...new Set(
        endorsementData.filter(d => d["Insurer"] === selectedInsurer)
            .map(d => d["Requirement"])
    )].sort();
    requirements.forEach(req => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = req;
        requirementDropdown.appendChild(opt);
    });
    requirementDropdown.disabled = false;
});

// Handle requirement selection for endorsement
requirementDropdown.addEventListener("change", () => {
    const ins = insurerDropdown.value;
    const req = requirementDropdown.value;
    const record = endorsementData.find(
        d => d["Insurer"] === ins && d["Requirement"] === req
    );
    if (record) {
        outputBox.innerHTML = `
            <div><span class="label">Endorsement Type:</span><span class="value">${record["Endorsement type"]}</span></div>
            <div><span class="label">Documents Required:</span><span class="value">${record["Documents or any other requirement"]}</span></div>
            <div><span class="label">TAT:</span><span class="value">${record["TAT"]}</span></div>
            <div><span class="label">Charges/Deduction:</span><span class="value">${record["Charges / Deduction"]}</span></div>
            <div><span class="label">Inspection:</span><span class="value">${record["Inspection"]}</span></div>
            <div><span class="label">Exception:</span><span class="value">${record["Any Exception"]}</span></div>
            <div><span class="label">Declaration Format:</span><span class="value">${record["Declaration format (if declaration required)"]}</span></div>
          `;
        if (record["Endorsement type"].toLowerCase() === "not possible") {
            outputBox.classList.add("output-red");
        } else {
            outputBox.classList.remove("output-red");
        }
        outputBox.style.display = "block";
        setTimeout(() => outputBox.classList.add("show"), 10);
    }
});

// Insurance Comparison Dashboard Data and Logic (from index (4).html)
const insuranceData = [
    {
        "insurer_name": "National",
        "video_approval": "At PB end",
        "video_tat": "24 Hours",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "ZD Plan: 2, ZD+: Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "Yes"
    },
    {
        "insurer_name": "New India Assurance",
        "video_approval": "At PB end",
        "video_tat": "24 Hours",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "Yes",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "Oriental",
        "video_approval": "At PB end",
        "video_tat": "24 Hours",
        "short_partial": "No",
        "cng_kit_vi": "Yes",
        "artificial_low_lighting": "Yes",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "Yes"
    },
    {
        "insurer_name": "United India",
        "video_approval": "At PB end",
        "video_tat": "48 Hours",
        "short_partial": "Yes",
        "cng_kit_vi": "Yes",
        "artificial_low_lighting": "Yes",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "Yes"
    },
    {
        "insurer_name": "Tata AIG",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "Yes",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required (with vehicle number) within Video TAT",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "Yes",
        "old_3_3": "Yes",
        "vas": "No"
    },
    {
        "insurer_name": "ICICI Lombard",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "Yes",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "2<br>Unlimited for Maruti, Hyundai, Honda, Toyota, Kia, MG, Volvo, Ford",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "Yes",
        "old_3_3": "Yes",
        "vas": "Yes"
    },
    {
        "insurer_name": "Zuno General",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "Yes"
    },
    {
        "insurer_name": "Cholamandalam MS",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Will Not Accept Scar on WS/change insurer",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "Future Generali",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "MAGMA",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required (Scar on Driver Side we will not accept) within Video TAT",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "Raheja QBE",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "Kotak",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited, 2 Cashless",
        "brand_new_3_3": "Yes",
        "old_3_3": "No",
        "vas": "Yes"
    },
    {
        "insurer_name": "SBI General",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "Shriram",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required (In Shriram format)+Address ID proof within Video TAT<br>Declaration required if Air Bag indicator is on at engine start",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "3",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "Yes"
    },
    {
        "insurer_name": "Iffco Tokio",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "Liberty Videocon",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "No",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Will Not Accept Scar on WS/change insurer",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "HDFC Ergo",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Will Not Accept Scar on WS/change insurer",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "Yes",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "Reliance",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required (with vehicle number) within Video TAT",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "Yes"
    },
    {
        "insurer_name": "Bajaj",
        "video_approval": "At U/W end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Will Refer to Under Writer",
        "zd_claims_year": "2",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "Yes"
    },
    {
        "insurer_name": "Royal Sundaram",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "Universal Sompo",
        "video_approval": "At U/W end",
        "video_tat": "2 days",
        "short_partial": "No",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Will Refer to Under Writer",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No",
        "vas": "No"
    },
    {
        "insurer_name": "Digit",
        "video_approval": "At PB end",
        "video_tat": "2 days",
        "short_partial": "Yes",
        "cng_kit_vi": "No",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "Yes",
        "old_3_3": "Yes",
        "vas": "No"
    }
];
// You will need to add your insurance data here in the future
/*
const insuranceData =
// You will need to add your insurance data here in the future
/*
const insuranceData = [
    {
        "insurer_name": "National",
        "commercial": "Yes",
        "video_approval": "At PB end",
        "video_tat": "24 Hours",
        "short_partial": "Yes",
        "artificial_low_lighting": "No",
        "scar_declaration": "Declaration Required within Video TAT",
        "zd_claims_year": "ZD Plan: 2, ZD+: Unlimited",
        "non_zd_claims_year": "Unlimited",
        "brand_new_3_3": "No",
        "old_3_3": "No"
    },
    // ... all other 27 companies if needed];
*/

function populateTable(data) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) {
        console.error("Error: tableBody element not found for insuranceTable.");
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows
    if (data.length === 0) {
        // Display a message if no data is available
        tableBody.innerHTML = '<tr><td colspan="12" class="p-4 text-center text-gray-500">No insurance data available. Please add data to the "insuranceData" array in the script.</td></tr>';
        return;
    }
    data.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'table-row border-b';
        row.innerHTML = `
                  <td class="p-2 font-medium text-indigo-900">${item.insurer_name}</td>
                  <td class="p-2">${item.zd_claims_year}</td>
                  <td class="p-2">${item.non_zd_claims_year}</td>
                  <td class="p-2">${item.video_approval}</td>
                  <td class="p-2">${item.video_tat}</td>
                  <td class="p-2 ${item.short_partial === 'Yes' ? 'text-green-700' : 'text-red-700'}">${item.short_partial}</td>
                  <td class="p-2 ${item.cng_kit_vi === 'Yes' ? 'text-green-700' : 'text-red-700'}">${item.cng_kit_vi}</td>
                  <td class="p-2 ${item.artificial_low_lighting === 'Yes' ? 'text-green-700' : 'text-red-700'}">${item.artificial_low_lighting}</td>
                  <td class="p-2">${item.scar_declaration}</td>
                  <td class="p-2 ${item.brand_new_3_3 === 'Yes' ? 'text-green-700' : 'text-red-700'}">${item.brand_new_3_3}</td>
                  <td class="p-2 ${item.old_3_3 === 'Yes' ? 'text-green-700' : 'text-red-700'}">${item.old_3_3}</td>
                  <td class="p-2 ${item.vas === 'Yes' ? 'text-green-700' : 'text-red-700'}">${item.vas}</td>
              `;
        tableBody.appendChild(row);
    });
}

function sortTable(column, order) {
    // Create a copy of the original data to sort, to avoid modifying the global `insuranceData` directly
    const sortedData = [...insuranceData].sort((a, b) => {
        const aValue = String(a[column]).toLowerCase(); // Ensure values are strings for comparison
        const bValue = String(b[column]).toLowerCase();

        if (order === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
    populateTable(sortedData);
}

function setupInsuranceDashboardListeners() {
    // Remove existing listeners to prevent multiple bindings if the page is opened multiple times
    const tableHeaders = document.querySelectorAll('#insuranceTable .table-header');
    tableHeaders.forEach(header => {
        // Remove previous event listener safely by recreating the element
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
    });

    // Add event listeners to the newly (or freshly cloned) table headers
    document.querySelectorAll('#insuranceTable .table-header').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            const currentOrder = header.classList.contains('sort-asc') ? 'desc' : 'asc';

            document.querySelectorAll('#insuranceTable .table-header').forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
                h.classList.add('sort-icon'); /* Default icon wapas add karein */
            });

            header.classList.remove('sort-icon'); /* Current header se default icon hatayen */
            header.classList.add(currentOrder === 'asc' ? 'sort-asc' : 'sort-desc');

            sortTable(column, currentOrder);
        });
    });

    // Remove existing listener for search input and re-add
    const searchInput = document.getElementById('searchInput');
    // searchInput maujood hai ya nahi, check karein clone karne se pehle
    if (searchInput) {
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        newSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredData = insuranceData.filter(item =>
                item.insurer_name.toLowerCase().includes(searchTerm)
            );
            populateTable(filteredData);
        });
    }
}

// Data for Inspection Waiver
const inspectionWaiverData = [
    { "Insurer Name": "Tata AIG", "Policy Waiver": "1 Day" },
    { "Insurer Name": "Reliance", "Policy Waiver": "15 Days (Renewal), 1 Day (New, Rollover)" },
    { "Insurer Name": "Bajaj Allianz", "Policy Waiver": "5 Days" },
    { "Insurer Name": "Chola MS", "Policy Waiver": "5 Days" },
    { "Insurer Name": "National Insurance", "Policy Waiver": "5 Days" },
    { "Insurer Name": "Shriram General Insurance", "Policy Waiver": "5 Days" },
    { "Insurer Name": "United Insurance", "Policy Waiver": "5 Days" },
    { "Insurer Name": "Zurich Kotak General Insurance", "Policy Waiver": "5 Days" },
    { "Insurer Name": "Royal Sundaram Insurance", "Policy Waiver": "7 Days" },
    { "Insurer Name": "New India Assurance", "Policy Waiver": "1 Day" },
    { "Insurer Name": "Oriental", "Policy Waiver": "3 Days" },
    { "Insurer Name": "HDFC ERGO", "Policy Waiver": "5 Days" },
    { "Insurer Name": "ICICI Lombard General Insurance Company Ltd", "Policy Waiver": "No Waiver" },
    { "Insurer Name": "DIGIT", "Policy Waiver": "No Waiver" },
    { "Insurer Name": "Future Generali", "Policy Waiver": "No Waiver" },
    { "Insurer Name": "IFFCO Tokio", "Policy Waiver": "No Waiver" },
    { "Insurer Name": "Liberty General Insurance", "Policy Waiver": "No Waiver" },
    { "Insurer Name": "Magma HDI General Insurance", "Policy Waiver": "No Waiver" },
    { "Insurer Name": "Universal Sompo", "Policy Waiver": "No Waiver" },
    { "Insurer Name": "Zuno", "Policy Waiver": "No Waiver" },
    { "Insurer Name": "SBI", "Policy Waiver": "Only Renewal (5 Days)" }
];

function populateInspectionWaiverTable(data) {
    const tableBody = document.getElementById('inspectionWaiverTableBody');
    // Check if tableBody exists before proceeding
    if (!tableBody) {
        console.error("Error: inspectionWaiverTableBody element not found.");
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows
    data.forEach(item => {
        const row = document.createElement('tr');
        const waiverText = item["Policy Waiver"].toLowerCase();
        let waiverClass = '';
        if (waiverText.includes("no waiver")) {
            waiverClass = 'no-waiver';
        } else if (waiverText.includes("days") || waiverText.includes("day")) {
            waiverClass = 'days-waiver';
        }

        row.innerHTML = `
                  <td>${item["Insurer Name"]}</td>
                  <td class="policy-waiver-column ${waiverClass}">${item["Policy Waiver"]}</td>
              `;
        tableBody.appendChild(row);
    });
}

// #endregion

// #region 🔒 RSA & CONTACT DATA
// Function to clean numbers and replace commas with slashes
function cleanAndFormatNumber(numberString) {
    if (!numberString) return "";
    return numberString.replace(/,/g, '/').trim();
}

const rsaContactData = [

    { "Sr.": "1", "Insurer Name": "Bajaj Allianz", "RSA and Toll Free Number": "1800 209 5858 / 1800 209 0144 / 1800 103 5858", "Claim No.": "1800 209 0144 / 1800-209-5858" },
    { "Sr.": "2", "Insurer Name": "United Insurance", "RSA and Toll Free Number": "7042113114 (Roadzen-delhi) and 1800 210 2051 (ROI)", "Claim No.": "" },
    { "Sr.": "3", "Insurer Name": "Digit General", "RSA and Toll Free Number": "1800 258 5956 / (7026061234-whatsapp)", "Claim No.": "1800 103 4448" },
    { "Sr.": "4", "Insurer Name": "Edelweiss (Zuno)", "RSA and Toll Free Number": "22 4231 2000 / 1800 12 000", "Claim No.": "" },
    { "Sr.": "5", "Insurer Name": "Future Generali", "RSA and Toll Free Number": "1860 500 3333 / 1800 220 233 / 022 67837800", "Claim No.": "" },
    { "Sr.": "6", "Insurer Name": "HDFC Ergo", "RSA and Toll Free Number": "022 6234 6234 / 0120 6234 6234", "Claim No.": "" },
    { "Sr.": "7", "Insurer Name": "Iffco Tokio", "RSA and Toll Free Number": "1800 103 5499", "Claim No.": "" },
    { "Sr.": "8", "Insurer Name": "Kotak General Insurance", "RSA and Toll Free Number": "1800 266 4545", "Claim No.": "" },
    { "Sr.": "9", "Insurer Name": "Magma HDI", "RSA and Toll Free Number": "1800 266 3202", "Claim No.": "" },
    { "Sr.": "10", "Insurer Name": "Reliance General Insurance", "RSA and Toll Free Number": "022 4890 3009 / 1800 3009 / 022 48947020", "Claim No.": "" },
    { "Sr.": "11", "Insurer Name": "Royal Sundaram", "RSA and Toll Free Number": "1800 568 9999", "Claim No.": "" },
    { "Sr.": "12", "Insurer Name": "SBI General Insurance", "RSA and Toll Free Number": "1800 22 1111 / 1800 102 1111", "Claim No.": "" },
    { "Sr.": "13", "Insurer Name": "Shriram General Insurance", "RSA and Toll Free Number": "1800 300 30000 / 1800 103 3009", "Claim No.": "" },
    { "Sr.": "14", "Insurer Name": "TATA AIG", "RSA and Toll Free Number": "1800 266 7780", "Claim No.": "" },
    { "Sr.": "15", "Insurer Name": "Universal Sompo", "RSA and Toll Free Number": "1800 22 4030 / 1800 200 5142 / 022 27639800 / 1800 22 4090 / 1800 200 4030", "Claim No.": "" },
    { "Sr.": "16", "Insurer Name": "Raheja QBE", "RSA and Toll Free Number": "1800 102 7723", "Claim No.": "18001027723" },
    { "Sr.": "17", "Insurer Name": "Oriental Insurance", "RSA and Toll Free Number": "1800 309 1209", "Claim No.": "1800118485 / 011-33208485" },
    { "Sr.": "18", "Insurer Name": "New India Insurance", "RSA and Toll Free Number": "1800-209-1415", "Claim No.": "1800-209-1415" },
    { "Sr.": "19", "Insurer Name": "ICICI Lombard", "RSA and Toll Free Number": "1800 2666", "Claim No.": "1800 2666" },
    { "Sr.": "20", "Insurer Name": "National", "RSA and Toll Free Number": "1800 345 0330", "Claim No.": "" },
    { "Sr.": "21", "Insurer Name": "Liberty Videocon", "RSA and Toll Free Number": "1800 266 5844", "Claim No.": "" },
    { "Sr.": "22", "Insurer Name": "PB_What's App No.", "RSA and Toll Free Number": "8506013131", "Claim No.": "" },
    { "Sr.": "23", "Insurer Name": "PB_Service Team No.", "RSA and Toll Free Number": "1800-258-5970", "Claim No.": "" },
    { "Sr.": "24", "Insurer Name": "PB_Health Renewal Team No.", "RSA and Toll Free Number": "1800-572-3919", "Claim No.": "" },
    { "Sr.": "25", "Insurer Name": "PB_Health Sales Team No.", "RSA and Toll Free Number": "1800-419-7715", "Claim No.": "" },
    { "Sr.": "26", "Insurer Name": "PB_Car Motor Sales Team No.", "RSA and Toll Free Number": "1800-419--7716", "Claim No.": "" },
    { "Sr.": "27", "Insurer Name": "PB_Term/Jeevan Bima Sales Team No.", "RSA and Toll Free Number": "1800-419-7713", "Claim No.": "" },
    { "Sr.": "28", "Insurer Name": "PB_Investment Sales Team No.", "RSA and Toll Free Number": "1800-419-7717", "Claim No.": "" },
    { "Sr.": "29", "Insurer Name": "PB_Travel Sales Team No.", "RSA and Toll Free Number": "1800-419-7824", "Claim No.": "" },
    { "Sr.": "30", "Insurer Name": "PB_Corporate Sales Team No.", "RSA and Toll Free Number": "1800-309-0988", "Claim No.": "" },
    { "Sr.": "31", "Insurer Name": "PB_Corporate Service Team No.", "RSA and Toll Free Number": "1800-572-3918", "Claim No.": "" },
    { "Sr.": "32", "Insurer Name": "PB_Home Insurance Team No.", "RSA and Toll Free Number": "1800-258-7202", "Claim No.": "" },
    { "Sr.": "33", "Insurer Name": "PB_Commercial Vehicle Sales Team No.", "RSA and Toll Free Number": "0124-6108850", "Claim No.": "" },
    { "Sr.": "34", "Insurer Name": "PB_Service Email Id", "RSA and Toll Free Number": "CARE@POLICYBAZAAR.COM", "Claim No.": "" },
    { "Sr.": "35", "Insurer Name": "PB_NRI Team No.", "RSA and Toll Free Number": "0124-6656507", "Claim No.": "" },
    { "Sr.": "36", "Insurer Name": "PB Partner Agent Team No.", "RSA and Toll Free Number": "1800-120-800", "Claim No.": "" },
    { "Sr.": "37", "Insurer Name": "PB_Mail", "RSA and Toll Free Number": "SUPPORT@PBPARTNER.COM", "Claim No.": "" },
    { "Sr.": "38", "Insurer Name": "Paisa Bazaar.com Team No.", "RSA and Toll Free Number": "1800-208-8877", "Claim No.": "" },
    { "Sr.": "39", "Insurer Name": "PB_2W Renewal Team No.", "RSA and Toll Free Number": "0124-6138301", "Claim No.": "" },
    { "Sr.": "40", "Insurer Name": "PB_Sales Team No.", "RSA and Toll Free Number": "1800-419-7716", "Claim No.": "" },
    { "Sr.": "41", "Insurer Name": "PB_Claim Team NO.", "RSA and Toll Free Number": "1800-258-5881", "Claim No.": "" }

];

function populateRSATable(data) {
    const tableBody = document.getElementById('rsaContactTableBody');
    // Check if tableBody exists before proceeding
    if (!tableBody) {
        console.error("Error: rsaContactTableBody element not found.");
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No RSA & Contact data available.</td></tr>';
        return;
    }
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
                  <td>${item["Sr."]}</td>
                  <td>${item["Insurer Name"]}</td>
                  <td>${cleanAndFormatNumber(item["RSA and Toll Free Number"])}</td>
                  <td>${cleanAndFormatNumber(item["Claim No."])}</td>
              `;
        tableBody.appendChild(row);
    });
}

function setupRSADashboardListeners() {
    // Remove existing listener for search input and re-add
    const rsaSearchInput = document.getElementById('rsaSearchInput');
    if (rsaSearchInput) {
        const newRSASearchInput = rsaSearchInput.cloneNode(true);
        rsaSearchInput.parentNode.replaceChild(newRSASearchInput, rsaSearchInput);

        newRSASearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredData = rsaContactData.filter(item =>
                item["Insurer Name"].toLowerCase().includes(searchTerm) ||
                cleanAndFormatNumber(item["RSA and Toll Free Number"]).toLowerCase().includes(searchTerm) ||
                cleanAndFormatNumber(item["Claim No."]).toLowerCase().includes(searchTerm)
            );
            populateRSATable(filteredData);
        });
    }
}


// Page load hone par images ko shuruat mein load karein
loadImages();

// #endregion

// #region 🔒 UPDATES BUTTON & MODAL
// --- NEW JAVASCRIPT FOR UPDATES BUTTON AND MODAL ---
document.addEventListener('DOMContentLoaded', function () {
    const updatesButton = document.getElementById('companyUpdatesButton');
    const updatesModal = document.getElementById('updatesModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const updatesContainer = document.getElementById('updatesContainer');
    const latestUpdateSnippetElem = document.getElementById('latestUpdateSnippet');
    const newUpdateIndicator = document.getElementById('newUpdateIndicator');

    // --- IMPORTANT: DAILY UPDATES DATA SECTION (दैनिक अपडेट डेटा सेक्शन) ---
    // YAHAN AAP APNE DAILY UPDATES DALEIN. (यहां आप अपने दैनिक अपडेट डालें।)
    // Har company ke liye, updates ko array ke andar dalien. (हर कंपनी के लिए, अपडेट को एरे के अंदर डालें।)
    // Naye updates ko array ke shuruat (top) mein dalien, taaki woh pehle dikhein. (नए अपडेट को एरे की शुरुआत (शीर्ष) में डालें, ताकि वह पहले दिखें।)
    // Format: { date: "YYYY-MM-DD", update: "Your update text here" } (फॉर्मेट: { date: "YYYY-MM-DD", update: "आपका अपडेट टेक्स्ट यहां" })
    const companyUpdates = {
        "National": [],
        "New India Assurance": [],
        "Oriental": [],
        "United India": [],
        "Tata AIG": [{
            "date": "2025-06-30",
            "update": "TATA AIG Battery Protection Cover 1. Applicable for EV vehicles 2. Covers damage to battery, drive motor/electric motor, and includes chargers & cables as well (up to the IDV) 3. Provides coverage for water ingression, short circuit, or damages from accidental external factors 4. Counted as a claim 5. Allowed 2 times in a policy year"
        }
        ],
        "ICICI Lombard": [{
            "date": "2025-06-30",
            "update": "ICICI Lombard Battery Protection 1. Provides coverage for damages arising from water ingression or short circuits, resulting in loss or damage to the battery, drive motor/electric motor, and HEV (Hybrid Electric Vehicle) system 2. Coverage extends up to the Insured Declared Value (IDV) 3. Counted as a claim with a limit of 1 time per policy year 4. Charging cables and chargers are not included under this protection cover 5. Applicable for both Hybrid and EV vehicles"
        }
        ],
        "Zuno General": [],
        "Cholamandalam MS": [],
        "Future Generali": [],
        "Magma": [],
        "Raheja QBE": [],
        "Kotak": [],
        "SBI General": [{ date: "2025-08-11", update: "For all Pre issuance rejection: Please mark an email to customer regarding the refund process of 7 working days from the date of rejection" }],
        "Shriram": [],
        "IFFCO Tokio": [],
        "Liberty Videocon": [],
        "HDFC Ergo": [],
        "Reliance": [
            { date: "2025-06-12", update: "Unmasked KYC documents (Aadhar and PAN card) are needed for KYC in Reliance. Please ask the CX to share Aadhar card through Email." }
        ],
        "Bajaj Allianz": [],
        "Royal Sundaram": [],
        "Universal Sompo": [],
        "Digit": [{ date: "2025-06-12", update: "if cx comes for odometere update in DIGIT , THese 4 things needs to be captured:- odomeret reading, engraved, chasis number, 360 degree view and Engiene compartment" }, {
            "date": "2025-06-30",
            "update": "Digit Battery Protection Add-on 1. Applicable for both Hybrid and EV vehicles 2. Covers damage to battery, drive motor/electric motor, and Hybrid Electric Vehicle (HEV), including chargers and cables as well (up to the IDV) 3. Provides coverage for water ingression, short circuit, or damages from accidental external factors 4. Counted as a claim 5. Allowed 2 times in a policy year"
        }, { date: "2025-08-11", update: "For all Pre issuance rejection: Please mark an email to customer regarding the refund process of 7 working days from the date of rejection" }],
        "BAJAJ CPA": [],
        "DIGIT CPA": [],
        "CHOLA CPA": [],
        "KOTAK CPA": [],
        "RELIENCE CPA": [],
        "LIBERTY CPA": []
    };
    // --- END OF DAILY UPDATES DATA SECTION ---


    // This variable will hold the snippet for display on the button.
    let latestUpdateSnippetText = "";
    let hasNewUpdate = false;

    // Find the most recent update among all companies for the button snippet
    // This will pick the first company in the list that has an update.
    // If no updates are present in any company, hasNewUpdate will remain false.
    // Sort all updates by date in descending order to get the latest one
    const allUpdates = [];
    for (const company in companyUpdates) {
        if (companyUpdates.hasOwnProperty(company)) {
            companyUpdates[company].forEach(updateItem => {
                allUpdates.push({ company: company, date: updateItem.date, update: updateItem.update });
            });
        }
    }

    allUpdates.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allUpdates.length > 0) {
        const mostRecentUpdate = allUpdates[0];
        latestUpdateSnippetText = `${mostRecentUpdate.company}: ${mostRecentUpdate.update}`;
        hasNewUpdate = true;
    }


    // Function to display the modal
    function showUpdatesModal() {
        if (updatesModal) updatesModal.classList.add('active');
        populateUpdates(); // Populate updates when modal opens
        // After showing, mark as seen for this session
        sessionStorage.setItem('updatesSeen', 'true');
        hideNewUpdateIndicatorAndSnippet(); // Hide indicator once modal is opened
        hideAllMainContent(); // Hide other main content when updates modal is open
    }

    // Function to hide the modal
    function closeUpdatesModal() {
        if (updatesModal) updatesModal.classList.remove('active');
        showAllMainContent(); // Show other main content when updates modal is closed
    }

    // Function to populate the updates in an accordion style
    function populateUpdates() {
        if (!updatesContainer) {
            console.error("Error: updatesContainer element not found.");
            return;
        }
        updatesContainer.innerHTML = ''; // Clear previous content
        // Dynamically add all company names as accordion headers
        const allCompanies = [
            "National", "New India Assurance", "Oriental", "United India", "Tata AIG",
            "ICICI Lombard", "Zuno General", "Cholamandalam MS", "Future Generali",
            "Magma", "Raheja QBE", "Kotak", "SBI General", "Shriram", "IFFCO Tokio",
            "Liberty Videocon", "HDFC Ergo", "Reliance", "Bajaj Allianz", "Royal Sundaram",
            "Universal Sompo", "Digit", "BAJAJ CPA", "DIGIT CPA", "CHOLA CPA",
            "KOTAK CPA", "RELIENCE CPA", "LIBERTY CPA"
        ];

        allCompanies.forEach(company => {
            const companyUpdatesList = companyUpdates[company] || []; // Use empty array if company not in data
            // Sort updates for each company by date descending
            companyUpdatesList.sort((a, b) => new Date(b.date) - new Date(a.date));

            const accordionItem = document.createElement('div');
            accordionItem.classList.add('accordion-item');

            const accordionHeader = document.createElement('div');
            accordionHeader.classList.add('accordion-header');
            accordionHeader.textContent = company; // Company name is always set
            accordionHeader.dataset.company = company; // Store company name for identifier

            const accordionContent = document.createElement('div');
            accordionContent.classList.add('accordion-content');
            const ul = document.createElement('ul');

            if (companyUpdatesList.length === 0) {
                const li = document.createElement('li');
                li.textContent = "No updates available yet."; // This text is added if no updates
                ul.appendChild(li);
            } else {
                companyUpdatesList.forEach(updateItem => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${updateItem.date}:</strong> ${updateItem.update}`;
                    ul.appendChild(li);
                });
            }

            accordionContent.appendChild(ul);
            accordionItem.appendChild(accordionHeader);
            accordionItem.appendChild(accordionContent);
            updatesContainer.appendChild(accordionItem);
        });

        // Add event listeners to all accordion headers
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', function () {
                const content = this.nextElementSibling;
                // Toggle active class on header
                this.classList.toggle('active');
                // Toggle active class on content to control max-height and padding
                content.classList.toggle('active');
            });
        });
    }

    // --- New Update Indicator Logic ---
    function showNewUpdateIndicatorAndSnippet() {
        // If there's an update and it hasn't been seen in this session
        if (hasNewUpdate && !sessionStorage.getItem('updatesSeen')) {
            if (latestUpdateSnippetElem) latestUpdateSnippetElem.textContent = latestUpdateSnippetText;
            if (newUpdateIndicator) newUpdateIndicator.style.display = 'block'; // Show the pulsating dot
        } else {
            if (latestUpdateSnippetElem) latestUpdateSnippetElem.textContent = ''; // Clear snippet
            if (newUpdateIndicator) newUpdateIndicator.style.display = 'none';
        }
    }

    function hideNewUpdateIndicatorAndSnippet() {
        if (latestUpdateSnippetElem) latestUpdateSnippetElem.textContent = '';
        if (newUpdateIndicator) newUpdateIndicator.style.display = 'none';
    }

    // --- Event Listeners for the New Updates Feature ---
    if (updatesButton) updatesButton.addEventListener('click', showUpdatesModal);
    if (closeModalButton) closeModalButton.addEventListener('click', closeUpdatesModal);
    // Close modal if clicked directly on the overlay background
    if (updatesModal) {
        updatesModal.addEventListener('click', function (event) {
            if (event.target === updatesModal) { // Only closes if clicked on the dark background
                closeUpdatesModal();
            }
        });
    }

    // Initial call to display new update indicator/snippet on page load
    showNewUpdateIndicatorAndSnippet();
});
// Fill CSAT & Quality dropdowns + AHT + Absenteeism
window.onload = function () {
    let csatSelect = document.getElementById("incentiveCSAT");
    let qualitySelect = document.getElementById("incentiveQuality");
    let minSelect = document.getElementById("incentiveAHTMin");
    let secSelect = document.getElementById("incentiveAHTSec");
    let absentSelect = document.getElementById("incentiveAbsent");

    // Clear existing options to prevent duplication issues
    if (csatSelect) csatSelect.innerHTML = '';
    if (qualitySelect) qualitySelect.innerHTML = '';
    if (minSelect) minSelect.innerHTML = '';
    if (secSelect) secSelect.innerHTML = '';
    if (absentSelect) absentSelect.innerHTML = '';

    // CSAT 80–100
    if (csatSelect) {
        for (let i = 80; i <= 100; i++) {
            csatSelect.innerHTML += `<option value="${i}">${i}%</option>`;
            if (i < 100) csatSelect.innerHTML += `<option value="${i}+">${i}+%</option>`;
        }
        csatSelect.value = "90";
    }

    // Quality 40–100
    if (qualitySelect) {
        for (let i = 40; i <= 100; i++) {
            qualitySelect.innerHTML += `<option value="${i}">${i}%</option>`;
            if (i < 100) qualitySelect.innerHTML += `<option value="${i}+">${i}+%</option>`;
        }
        qualitySelect.value = "90";
    }

    // AHT minutes (2–7 min)
    if (minSelect) {
        for (let i = 2; i <= 7; i++) {
            minSelect.innerHTML += `<option value="${i}">${i} Min</option>`;
        }
        minSelect.value = "4";
    }

    // AHT seconds (0 to 59 sec)
    if (secSelect) {
        for (let i = 0; i < 60; i++) {
            secSelect.innerHTML += `<option value="${i}">${i} Sec</option>`;
        }
        secSelect.value = "30";
    }

    // Absenteeism (0 to 25 days)
    if (absentSelect) {
        for (let i = 0; i <= 25; i++) {
            absentSelect.innerHTML += `<option value="${i}">${i} ${i <= 1 ? "Day" : "Days"}</option>`;
        }
        absentSelect.value = "0";
    }

    // Scorecard Initialization
    let scCallCSAT = document.getElementById("scCallCSAT");
    let scTicketCSAT = document.getElementById("scTicketCSAT");
    let scQuality = document.getElementById("scQuality");
    let scAudit = document.getElementById("scAudit");
    let scAHTMin = document.getElementById("scAHTMin");
    let scAHTSec = document.getElementById("scAHTSec");
    let scLateLogin = document.getElementById("scLateLogin");
    let scLoginHrs = document.getElementById("scLoginHrs");
    let scLoginMins = document.getElementById("scLoginMins");

    if (scCallCSAT) {
        for (let i = 0; i <= 100; i++) {
            scCallCSAT.innerHTML += `<option value="${i}">${i}%</option>`;
            if (i < 100) scCallCSAT.innerHTML += `<option value="${i}+">${i}+%</option>`;
        }
        scCallCSAT.value = "90";
    }
    if (scTicketCSAT) {
        for (let i = 0; i <= 100; i++) {
            scTicketCSAT.innerHTML += `<option value="${i}">${i}%</option>`;
            if (i < 100) scTicketCSAT.innerHTML += `<option value="${i}+">${i}+%</option>`;
        }
        scTicketCSAT.value = "90";
    }
    if (scQuality) {
        for (let i = 0; i <= 100; i++) {
            scQuality.innerHTML += `<option value="${i}">${i}%</option>`;
            if (i < 100) scQuality.innerHTML += `<option value="${i}+">${i}+%</option>`;
        }
        scQuality.value = "90";
    }
    if (scAudit) {
        for (let i = 0; i <= 100; i++) {
            scAudit.innerHTML += `<option value="${i}">${i}%</option>`;
            if (i < 100) scAudit.innerHTML += `<option value="${i}+">${i}+%</option>`;
        }
        scAudit.value = "80";
    }
    if (scAHTMin) {
        for (let i = 0; i <= 15; i++) {
            scAHTMin.innerHTML += `<option value="${i}">${i} Min</option>`;
        }
        scAHTMin.value = "4";
    }
    if (scAHTSec) {
        for (let i = 0; i < 60; i++) {
            scAHTSec.innerHTML += `<option value="${i}">${i} Sec</option>`;
        }
        scAHTSec.value = "30";
    }
    if (scLateLogin) {
        for (let i = 0; i <= 31; i++) {
            scLateLogin.innerHTML += `<option value="${i}">${i} ${i <= 1 ? "Day" : "Days"}</option>`;
        }
        scLateLogin.value = "0";
    }
    if (scLoginHrs) {
        for (let i = 0; i <= 24; i++) {
            scLoginHrs.innerHTML += `<option value="${i}">${i} Hrs</option>`;
        }
        scLoginHrs.value = "9";
    }
    if (scLoginMins) {
        for (let i = 0; i < 60; i++) {
            scLoginMins.innerHTML += `<option value="${i}">${i} Min</option>`;
        }
        scLoginMins.value = "0";
    }
};

// Open Modal
window.openIncentiveModal = function () {
    document.getElementById("incentiveModal").style.display = "flex";
};

// Close Modal
window.closeIncentiveModal = function () {
    document.getElementById("incentiveModal").style.display = "none";
};

// --- Helper Functions ---

// Step 1: Calling CSAT multiplier (Base Amount)
function getCSATBaseAmount(csatValue) {
    let csat = parseFloat(csatValue);
    let isPlus = String(csatValue).includes("+");

    // Convert e.g., "93+" to a slightly higher number to use <= logic easily
    let val = isPlus ? csat + 0.1 : csat;

    // As per requirement:
    // exactly 93 -> 8000, 93+ -> 10000
    // upper bounds are inclusive
    if (val <= 85) return 0;
    if (val <= 87) return 2000;
    if (val <= 90) return 5000;
    if (val <= 91) return 6000;
    if (val <= 92) return 7000;
    if (val <= 93) return 8000;

    return 10000; // > 93
}

// Step 2: AHT Multiplier
function getAHTMultiplier(ahtSecs) {
    // 03:50 = 230 secs
    // 04:50 = 290 secs
    // 06:00 = 360 secs

    // Agar time exact boundary ho tabhi agli range mein jayega:
    if (ahtSecs < 230) return 1.0;     // e.g. 3m 49s = 100%
    if (ahtSecs < 290) return 0.95;    // e.g. exactly 3m 50s = 95%
    if (ahtSecs < 360) return 0.90;    // e.g. exactly 4m 50s = 90%

    return 0.0;                        // exactly 6m 00s = 0%
}

// Step 3: Quality Score Multiplier
function getQualityMultiplier(qualityValue) {
    let quality = parseFloat(qualityValue);
    let isPlus = String(qualityValue).includes("+");

    let val = isPlus ? quality + 0.1 : quality;

    // Upper bounds inclusive
    if (val <= 75) return 0.0;
    if (val <= 80) return 0.75;
    if (val <= 85) return 0.90;
    if (val <= 90) return 1.00;

    return 1.10; // > 90
}

// Step 4: Absenteeism Days Multiplier
function getAbsenteeismMultiplier(days) {
    if (days === 0) return 1.10;
    if (days === 1) return 1.00;
    if (days === 2) return 0.95;
    if (days === 3) return 0.90;
    if (days === 4) return 0.85;
    if (days >= 5 && days <= 7) return 0.80;
    if (days >= 8 && days <= 10) return 0.75;
    if (days >= 11 && days <= 15) return 0.70;
    if (days >= 16 && days <= 21) return 0.60;
    if (days >= 22 && days <= 25) return 0.30;
    return 0.0; // Failsafe for > 25 days
}

// --- Main Logic ---
window.calculateIncentive = function () {
    let csatValue = document.getElementById("incentiveCSAT").value;
    let qualityValue = document.getElementById("incentiveQuality").value;
    let min = parseInt(document.getElementById("incentiveAHTMin").value);
    let sec = parseInt(document.getElementById("incentiveAHTSec").value);
    let absentDays = parseInt(document.getElementById("incentiveAbsent").value);

    let ahtSecs = min * 60 + sec; // total seconds

    // Calculate Step 1 Base Amount
    let baseAmount = getCSATBaseAmount(csatValue);

    // Calculate Step 2 AHT Multiplier
    let ahtMultiplier = getAHTMultiplier(ahtSecs);

    // Calculate Step 3 Quality Multiplier
    let qualityMultiplier = getQualityMultiplier(qualityValue);

    // Calculate Step 4 Absenteeism Multiplier
    let absentMultiplier = getAbsenteeismMultiplier(absentDays);

    // If Quality is too low or AHT is too high, it might 0 out the incentive early
    if (qualityMultiplier === 0) {
        document.getElementById("incentiveResult").innerHTML =
            "<p style='color:red;'>❌ Incentive Cancelled (Quality < 75%)</p>";
        return;
    }

    if (ahtMultiplier === 0) {
        document.getElementById("incentiveResult").innerHTML =
            "<p style='color:red;'>❌ Incentive Cancelled (AHT > 06:00)</p>";
        return;
    }

    // Final Calculation formula: Base * AHT% * Quality% * Absentee%
    let totalIncentive = baseAmount * ahtMultiplier * qualityMultiplier * absentMultiplier;

    document.getElementById(
        "incentiveResult"
    ).innerHTML = `
        <p>📊 Base Amount (CSAT): ₹${baseAmount}</p>
        <p>⏳ AHT Multiplier: ${(ahtMultiplier * 100).toFixed(0)}%</p>
        <p>🏆 Quality Multiplier: ${(qualityMultiplier * 100).toFixed(0)}%</p>
        <p>📅 Absenteeism Multiplier: ${(absentMultiplier * 100).toFixed(0)}%</p>
        <hr style="margin: 5px 0; border-top: 1px dotted #ccc;">
        <p style="font-size: 1.1em; color: #10b981;">💰 Final Incentive: <b>₹${totalIncentive.toFixed(0)}</b></p>
    `;
};

// Open/Close Scorecard Modal
window.openScorecardModal = function () {
    const sm = document.getElementById("scorecardModal");
    if (sm) sm.style.display = "flex";
};
window.closeScorecardModal = function () {
    const sm = document.getElementById("scorecardModal");
    if (sm) sm.style.display = "none";
};

// SCORECARD HELPERS (Boundary = lower slab)
function getScCallCSAT(tenure, val) {
    if (tenure === '0-3') {
        if (val <= 80) return 0;
        if (val <= 85) return 15;
        if (val <= 90) return 20;
        return 30; // > 90
    } else { // 3-6 and 6+ use same for Calling CSAT
        if (val <= 81) return 0;
        if (val <= 86) return 15;
        if (val <= 92) return 20;
        return 30;
    }
}

function getScTicketCSAT(tenure, val) {
    if (tenure === '0-3') {
        if (val <= 80) return 0;
        if (val <= 85) return 2;
        if (val <= 88) return 3;
        return 5;
    } else { // 3-6 and 6+
        if (val <= 80) return 0;
        if (val <= 85) return 2;
        if (val <= 90) return 3;
        return 5;
    }
}

function getScAHT(tenure, secs) {
    if (tenure === '0-3') {
        if (secs < 285) return 20;  // < 04:45
        if (secs <= 300) return 15; // <= 05:00
        if (secs <= 315) return 10; // <= 05:15
        return 0;
    } else if (tenure === '3-6') {
        if (secs < 270) return 20;  // < 04:30
        if (secs <= 285) return 15; // <= 04:45
        if (secs <= 300) return 10; // <= 05:00
        return 0;
    } else if (tenure === '6+') {
        if (secs < 255) return 20;  // < 04:15
        if (secs <= 270) return 15; // <= 04:30
        if (secs <= 285) return 10; // <= 04:45
        return 0;
    }
}

function getScQuality(tenure, val) {
    if (tenure === '0-3') {
        if (val <= 80) return 0;
        if (val <= 85) return 7;
        if (val <= 87) return 10;
        return 15;
    } else if (tenure === '3-6') {
        if (val <= 80) return 0;
        if (val <= 85) return 7;
        if (val <= 89) return 10;
        return 15;
    } else if (tenure === '6+') {
        if (val <= 80) return 0;
        if (val <= 85) return 7;
        if (val <= 90) return 10;
        return 15;
    }
}

function getScAudit(val) {
    if (val <= 70) return 0;
    if (val <= 75) return 5;
    if (val <= 80) return 7;
    return 10;
}

function getScLateLogin(days) {
    if (days <= 1) return 10;
    if (days === 2) return 5;
    return 0;
}

function getScLoginHrs(mins) {
    if (mins < 420) return 0;   // < 07:00
    if (mins <= 450) return 5;  // <= 07:30
    if (mins <= 470) return 7;  // <= 07:50
    return 10;                  // > 07:50
}

window.calculateScorecard = function () {
    let tenure = document.getElementById("scTenure").value;

    // Helper to parse "92+" properly
    const parseParam = (str) => {
        let p = parseFloat(str);
        if (String(str).includes("+")) return p + 0.1;
        return p;
    };

    let callCsat = parseParam(document.getElementById("scCallCSAT").value);
    let ticCsat = parseParam(document.getElementById("scTicketCSAT").value);
    let qual = parseParam(document.getElementById("scQuality").value);
    let audit = parseParam(document.getElementById("scAudit").value);

    let ahtMin = parseInt(document.getElementById("scAHTMin").value);
    let ahtSec = parseInt(document.getElementById("scAHTSec").value);
    let ahtSecsTotal = (ahtMin * 60) + ahtSec;

    let lateLogin = parseInt(document.getElementById("scLateLogin").value);

    let logHrs = parseInt(document.getElementById("scLoginHrs").value);
    let logMins = parseInt(document.getElementById("scLoginMins").value);
    let loginMinTotal = (logHrs * 60) + logMins;

    let ptCall = getScCallCSAT(tenure, callCsat);
    let ptTic = getScTicketCSAT(tenure, ticCsat);
    let ptAht = getScAHT(tenure, ahtSecsTotal);
    let ptQual = getScQuality(tenure, qual);
    let ptAud = getScAudit(audit);
    let ptLate = getScLateLogin(lateLogin);
    let ptLog = getScLoginHrs(loginMinTotal);

    let totalScore = ptCall + ptTic + ptAht + ptQual + ptAud + ptLate + ptLog;

    document.getElementById("scorecardResult").innerHTML = `
        <p style="text-align:center; margin-bottom:10px;"><span class="colorful-text" style="font-size:0.9em;">Created by Shivang</span></p>
        <div style="display:flex; justify-content:space-between; font-size:14px; border-bottom:1px dotted #ccc; margin-bottom:5px;"><span>Calling CSAT:</span> <b>${ptCall} / 30</b></div>
        <div style="display:flex; justify-content:space-between; font-size:14px; border-bottom:1px dotted #ccc; margin-bottom:5px;"><span>Ticket CSAT:</span> <b>${ptTic} / 5</b></div>
        <div style="display:flex; justify-content:space-between; font-size:14px; border-bottom:1px dotted #ccc; margin-bottom:5px;"><span>AHT IB+CTC:</span> <b>${ptAht} / 20</b></div>
        <div style="display:flex; justify-content:space-between; font-size:14px; border-bottom:1px dotted #ccc; margin-bottom:5px;"><span>Quality:</span> <b>${ptQual} / 15</b></div>
        <div style="display:flex; justify-content:space-between; font-size:14px; border-bottom:1px dotted #ccc; margin-bottom:5px;"><span>Internal Audit:</span> <b>${ptAud} / 10</b></div>
        <div style="display:flex; justify-content:space-between; font-size:14px; border-bottom:1px dotted #ccc; margin-bottom:5px;"><span>Late Login:</span> <b>${ptLate} / 10</b></div>
        <div style="display:flex; justify-content:space-between; font-size:14px; border-bottom:1px dotted #ccc; margin-bottom:5px;"><span>Login Hour:</span> <b>${ptLog} / 10</b></div>
        
        <p style="font-size: 1.3em; color: #0f766e; text-align:center; margin-top:15px;">🏆 Total Score: <b>${totalScore} / 100</b></p>
    `;
};
// Highlight "NO" cells in ADP table
document.addEventListener("DOMContentLoaded", () => {
    const adpTable = document.querySelector(".manual-vi-page table");
    if (adpTable) {
        adpTable.querySelectorAll("td").forEach(td => {
            if (td.textContent.trim().toUpperCase() === "NO") {
                td.classList.add("bg-red-100", "text-red-700", "font-semibold");
            }
        });
    }
});
// ✅ PB Wheels Popup Control
window.openPBWheelsScript = function () {
    const popup = document.getElementById("pbPopup");
    const closeBtn = document.getElementById("closePopupBtn");
    if (!popup || !closeBtn) return;

    // 🔹 Popup open karo
    popup.classList.remove("hidden");

    // 🔹 Close button par click karne se band ho
    closeBtn.onclick = () => popup.classList.add("hidden");

    // 🔹 Popup ke bahar click karne se bhi band ho
    popup.addEventListener("click", (event) => {
        // agar user ne background (black area) pe click kiya
        if (event.target === popup) {
            popup.classList.add("hidden");
        }
    });
};

// ========================================
// Company Owned Vehicle (COV) Modal Logic
// ========================================

// Company lists for 2W and 4W
const covCompanyLists = {
    "2W": ["TATA", "SBI", "HDFC", "RSA", "ITGI (Iffco)", "Reliance", "SriRam", "USGI (Sompo)"],
    "4W": ["SBI", "HDFC", "RSA", "ITGI (Iffco)", "USGI (Sompo)"]
};

// Open COV Modal
function openCOVModal() {
    const modal = document.getElementById("covModal");
    if (modal) {
        modal.style.display = "flex";
        // Reset content when opening
        const covList = document.getElementById("covList");
        if (covList) {
            covList.innerHTML = '<p class="small">Select 2W or 4W to view companies.</p>';
        }
    }
}

// Close COV Modal
function closeCOVModal() {
    const modal = document.getElementById("covModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// Show company list based on type (2W or 4W)
function showCOVList(type) {
    const covList = document.getElementById("covList");
    if (!covList) return;

    const companies = covCompanyLists[type];
    if (companies && companies.length > 0) {
        let html = `<ul class="cov-company-list">`;
        companies.forEach(company => {
            html += `<li>${company}</li>`;
        });
        html += `</ul>`;
        covList.innerHTML = html;
    } else {
        covList.innerHTML = '<p class="small">No companies found.</p>';
    }
}

// Event Listeners for COV Modal
document.addEventListener("DOMContentLoaded", () => {
    // Open modal on button click
    const btnCompanyOwned = document.getElementById("btnCompanyOwned");
    if (btnCompanyOwned) {
        btnCompanyOwned.addEventListener("click", openCOVModal);
    }

    // Close modal on close button click
    const covClose = document.getElementById("covClose");
    if (covClose) {
        covClose.addEventListener("click", closeCOVModal);
    }

    // Close modal on outside click
    const covModal = document.getElementById("covModal");
    if (covModal) {
        covModal.addEventListener("click", (event) => {
            if (event.target === covModal) {
                closeCOVModal();
            }
        });
    }

    // 2W button click
    const btn2W = document.getElementById("btn2W");
    if (btn2W) {
        btn2W.addEventListener("click", () => {
            btn2W.classList.add("active");
            if (btn4W) btn4W.classList.remove("active");
            showCOVList("2W");
        });
    }

    // 4W button click
    const btn4W = document.getElementById("btn4W");
    if (btn4W) {
        btn4W.addEventListener("click", () => {
            btn4W.classList.add("active");
            if (btn2W) btn2W.classList.remove("active");
            showCOVList("4W");
        });
    }
});

// Close COV Modal on ESC key
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        const covModal = document.getElementById("covModal");
        if (covModal && covModal.style.display === "flex") {
            closeCOVModal();
        }
    }
});

// ========== CHAT FEATURE (Firebase) ==========
const commentsRef = dbRef(db, 'comments');
const chatCanvas = document.getElementById('chatCanvas');
const chatMessages = document.getElementById('chatMessages');

function toggleChat(show = null) {
    const visible = !chatCanvas.classList.contains('translate-y-full');
    const shouldShow = show !== null ? show : !visible;
    chatCanvas.classList.toggle('translate-y-full', !shouldShow);
    if (shouldShow) loadChatMessages();
}

// Expose to global scope for inline onclick handlers
window.toggleChat = toggleChat;
window.sendMessage = sendChatMessage;
window.deleteMessage = deleteChatMessage;

// Also attach via addEventListener for reliability
const openChatBtn = document.getElementById('openChatBtn');
if (openChatBtn) {
    openChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChat();
    });
}

window.addEventListener('click', function (e) {
    if (chatCanvas && !chatCanvas.contains(e.target) && openChatBtn && !openChatBtn.contains(e.target)) {
        toggleChat(false);
    }
});

function loadChatMessages() {
    onValue(commentsRef, (snapshot) => {
        chatMessages.innerHTML = '';
        const data = snapshot.val();
        if (!data) {
            chatMessages.innerHTML = '<div class="p-3 rounded-md bg-gray-100 shadow-sm text-sm text-center">No messages yet.</div>';
            return;
        }
        const messages = Object.entries(data)
            .map(([key, val]) => ({ id: key, ...val }))
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        messages.forEach((msg, i) => {
            const color = i % 2 === 0 ? 'bg-orange-100' : 'bg-blue-100';
            const div = document.createElement('div');
            div.className = `group relative p-3 rounded-md ${color} shadow-sm text-sm`;
            div.innerHTML = `
                <div class="flex justify-between">
                    <div>${msg.message}</div>
                    <button class="delete-msg-btn absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700" data-id="${msg.id}">❌</button>
                </div>
            `;
            div.querySelector('.delete-msg-btn').addEventListener('click', () => deleteChatMessage(msg.id));
            chatMessages.appendChild(div);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, (error) => {
        console.error("Failed to load messages:", error);
        chatMessages.innerHTML = '<div class="p-3 rounded-md bg-red-100 shadow-sm text-sm text-red-600 text-center">⚠️ Unable to connect to server. Please check your internet or try again later.</div>';
    });
}

function sendChatMessage() {
    const messageBox = document.getElementById('chatMessage');
    const message = messageBox.value.trim();
    if (!message) return alert("Please type something.");
    messageBox.value = '';

    push(commentsRef, {
        message: message,
        username: null,
        timestamp: Date.now()
    }).catch((error) => {
        console.error("Failed to send message:", error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'p-2 rounded-md bg-red-100 text-red-600 text-xs text-center mt-1';
        errorDiv.textContent = '⚠️ Failed to send. Server unreachable.';
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function deleteChatMessage(id) {
    const confirmed = confirm("Delete this message?");
    if (!confirmed) return;
    remove(dbRef(db, `comments/${id}`))
        .catch((error) => {
            console.error("Failed to delete message:", error);
            alert("⚠️ Could not delete message. Server unreachable.");
        });
}

// Send button click listener
const sendBtn = document.getElementById('sendChatBtn');
if (sendBtn) {
    sendBtn.addEventListener('click', sendChatMessage);
}

// Close chat button listener
const closeChatBtn = document.getElementById('closeChatBtn');
if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => toggleChat());
}

// Enter to send, Shift+Enter for newline
const chatInput = document.getElementById('chatMessage');
if (chatInput) {
    chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

// ========================================
// 🎮 Memory Card Game Logic
// ========================================

const memoryGameOverlay = document.getElementById('memoryGameOverlay');
const gameBoard = document.getElementById('gameBoard');
const moveCountEl = document.getElementById('moveCount');
const pairCountEl = document.getElementById('pairCount');
const gameTimerEl = document.getElementById('gameTimer');
const winMessage = document.getElementById('winMessage');
const winStats = document.getElementById('winStats');

// Game State
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = 0;
let timerInterval = null;
let isPlaying = false;
let boardLocked = false;

// Pair emojis for the game (8 pairs = 16 cards)
const cardEmojis = ['🚀', '🌟', '💻', '🎮', '🔥', '💎', '🌈', '🍕'];

// Initialize/Reset Game
function initMemoryGame() {
    // Reset state
    clearInterval(timerInterval);
    timerInterval = null;
    timer = 0;
    moves = 0;
    matchedPairs = 0;
    flippedCards = [];
    isPlaying = false;
    boardLocked = false;

    // Update UI
    moveCountEl.textContent = moves;
    pairCountEl.textContent = `${matchedPairs}/8`;
    gameTimerEl.textContent = '0:00';
    winMessage.classList.remove('show');
    gameBoard.innerHTML = '';

    // Create deck (2 of each emoji)
    let deck = [...cardEmojis, ...cardEmojis];

    // Shuffle deck (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Create UI cards
    deck.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.classList.add('memory-card');
        card.dataset.emoji = emoji;
        card.dataset.index = index;

        card.innerHTML = `
            <div class="memory-card-inner">
                <div class="memory-card-front"></div>
                <div class="memory-card-back">${emoji}</div>
            </div>
        `;

        card.addEventListener('click', () => flipCard(card));
        gameBoard.appendChild(card);
    });
}

// Flip Card Logic
function flipCard(card) {
    if (boardLocked || card.classList.contains('flipped') || card.classList.contains('matched')) return;

    // Start timer on first move
    if (!isPlaying) {
        isPlaying = true;
        timerInterval = setInterval(() => {
            timer++;
            const mins = Math.floor(timer / 60);
            const secs = timer % 60;
            gameTimerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
    }

    // Flip the card
    card.classList.add('flipped');
    flippedCards.push(card);

    // If two cards are flipped, check for match
    if (flippedCards.length === 2) {
        moves++;
        moveCountEl.textContent = moves;
        checkMatch();
    }
}

// Check Match Logic
function checkMatch() {
    boardLocked = true;
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.emoji === card2.dataset.emoji;

    if (isMatch) {
        // They match!
        setTimeout(() => {
            card1.classList.add('matched');
            card2.classList.add('matched');
            matchedPairs++;
            pairCountEl.textContent = `${matchedPairs}/8`;
            resetBoard();

            // Check win condition
            if (matchedPairs === 8) {
                gameWon();
            }
        }, 500); // Wait for flip animation
    } else {
        // Not a match
        setTimeout(() => {
            card1.classList.add('wrong');
            card2.classList.add('wrong');

            setTimeout(() => {
                card1.classList.remove('wrong', 'flipped');
                card2.classList.remove('wrong', 'flipped');
                resetBoard();
            }, 500); // Wait before un-flipping
        }, 600); // Give player a moment to see cards
    }
}

function resetBoard() {
    flippedCards = [];
    boardLocked = false;
}

// Win Logic (Memory Game)
function gameWon() {
    clearInterval(timerInterval);
    setTimeout(() => {
        const mins = Math.floor(timer / 60);
        const secs = timer % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        winStats.innerHTML = `You completed the game in <strong>${moves} moves</strong><br>Time taken: <strong>${timeStr}</strong>`;
        winMessage.classList.add('show');

        // Check for Leaderboard
        checkAndSaveScore('memory', moves, false); // Lower moves is better
    }, 500); // Small delay after last match
}

// Modal Controls - Expose to global window object
window.openMemoryGame = function () {
    memoryGameOverlay.classList.add('active');
    initMemoryGame(); // Start fresh every time it opens
    loadLeaderboard('memory', 'moves (lower is better)');
};

window.closeMemoryGame = function () {
    memoryGameOverlay.classList.remove('active');
    clearInterval(timerInterval); // Stop timer if it's running
};

window.restartMemoryGame = function () {
    initMemoryGame();
};

// Close modal on outside click or ESC key
memoryGameOverlay.addEventListener('click', (e) => {
    if (e.target === memoryGameOverlay) {
        window.closeMemoryGame();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && memoryGameOverlay.classList.contains('active')) {
        window.closeMemoryGame();
    }
});

// ========================================
// 🏆 Game Hub & Firebase Leaderboard System
// ========================================

const gameHubOverlay = document.getElementById('gameHubOverlay');

window.openGameHub = function () {
    gameHubOverlay.classList.add('active');
};

window.closeGameHub = function () {
    gameHubOverlay.classList.remove('active');
};

window.backToHub = function (overlayId) {
    document.getElementById(overlayId).classList.remove('active');
    // Stop any running intervals depending on the game
    if (overlayId === 'snakeGameOverlay') clearInterval(snakeInterval);
    if (overlayId === 'reactionGameOverlay') { clearTimeout(reactionTimeout); isReactionWaiting = false; }
    if (overlayId === 'whackGameOverlay') { clearInterval(moleInterval); clearInterval(whackTimerInterval); }
    if (overlayId === 'memoryGameOverlay') clearInterval(timerInterval);
    if (overlayId === 'bounceGameOverlay') clearInterval(bounceInterval);
    if (overlayId === 'starsGameOverlay') clearInterval(starsInterval);
    if (overlayId === 'aimGameOverlay') { clearInterval(aimTimerInterval); aimGameActive = false; }
    if (overlayId === 'flappyGameOverlay') { if (flappyAnimFrame) cancelAnimationFrame(flappyAnimFrame); flappyGameActive = false; }
    if (overlayId === 'colormatchGameOverlay') { clearInterval(colorMatchTimerInterval); colorMatchActive = false; }

    // Bring back hub
    openGameHub();
};

window.launchGame = function (gameType) {
    closeGameHub();
    if (gameType === 'memory') {
        window.openMemoryGame();
    } else if (gameType === 'snake') {
        document.getElementById('snakeGameOverlay').classList.add('active');
        loadLeaderboard('snake', 'points');
        window.startSnakeGame();
    } else if (gameType === 'reaction') {
        document.getElementById('reactionGameOverlay').classList.add('active');
        document.getElementById('reactionResult').textContent = '';
        const ra = document.getElementById('reactionArea');
        ra.style.backgroundColor = '#ef4444'; // reset to red
        ra.textContent = "Click to Start";
        loadLeaderboard('reaction', 'ms');
    } else if (gameType === 'whack') {
        document.getElementById('whackGameOverlay').classList.add('active');
        loadLeaderboard('whack', 'moles');
        window.startWhackGame();
    } else if (gameType === 'bounce') {
        document.getElementById('bounceGameOverlay').classList.add('active');
        loadLeaderboard('bounce', 'pts');
        window.startBounceGame();
    } else if (gameType === 'stars') {
        document.getElementById('starsGameOverlay').classList.add('active');
        loadLeaderboard('stars', 'pts');
        window.startStarsGame();
    } else if (gameType === 'aim') {
        document.getElementById('aimGameOverlay').classList.add('active');
        loadLeaderboard('aim', 'pts');
        window.startAimGame();
    } else if (gameType === 'flappy') {
        document.getElementById('flappyGameOverlay').classList.add('active');
        loadLeaderboard('flappy', 'pts');
        window.startFlappyGame();
    } else if (gameType === 'colormatch') {
        document.getElementById('colormatchGameOverlay').classList.add('active');
        loadLeaderboard('colormatch', 'pts');
        window.startColorMatchGame();
    } else if (gameType === 'airforce') {
        document.getElementById('airforceGameOverlay').classList.add('active');
        loadLeaderboard('airforce', 'pts');
    }
};

// --- Firebase Leaderboard Logic ---
// We'll store leaderboards under 'leaderboards' node in Firebase
const leaderboardsRef = dbRef(db, 'leaderboards');

function loadLeaderboard(gameId, unit) {
    const listElementId = `${gameId}LeaderboardList`;
    const listEl = document.getElementById(listElementId);
    if (!listEl) return;

    listEl.innerHTML = '<li class="text-center text-gray-400 text-sm">Loading scores...</li>';

    const gameBoardRef = dbRef(db, `leaderboards/${gameId}`);
    onValue(gameBoardRef, (snapshot) => {
        const data = snapshot.val();
        listEl.innerHTML = '';

        if (!data) {
            listEl.innerHTML = '<li class="text-center text-gray-400 text-sm">No high scores yet! Be the first!</li>';
            return;
        }

        // Convert to array and sort
        const scoresArray = Object.values(data);

        if (gameId === 'memory' || gameId === 'reaction') {
            // Lower is better (Moves or MS)
            scoresArray.sort((a, b) => a.score - b.score);
        } else {
            // Higher is better (Snake points, Moles hit)
            scoresArray.sort((a, b) => b.score - a.score);
        }

        // Take top 3
        const top3 = scoresArray.slice(0, 3);

        top3.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = `rank-${index + 1}`;
            li.innerHTML = `<span>#${index + 1} ${item.name}</span> <span>${item.score} ${unit}</span>`;
            listEl.appendChild(li);
        });

    }, { onlyOnce: true });
}

function checkAndSaveScore(gameId, newScore, isHigherBetter = true) {
    const gameBoardRef = dbRef(db, `leaderboards/${gameId}`);

    // Temporary listener to get current top scores
    onValue(gameBoardRef, (snapshot) => {
        const data = snapshot.val();
        let shouldSave = false;

        if (!data) {
            shouldSave = true; // No scores yet
        } else {
            const scoresArray = Object.values(data);
            if (scoresArray.length < 3) {
                shouldSave = true; // Less than 3 scores
            } else {
                // Sort current scores
                if (isHigherBetter) {
                    scoresArray.sort((a, b) => b.score - a.score);
                    // Beat the 3rd place?
                    if (newScore > scoresArray[2].score) shouldSave = true;
                } else {
                    scoresArray.sort((a, b) => a.score - b.score);
                    // Beat the 3rd place (lower is better)?
                    if (newScore < scoresArray[2].score) shouldSave = true;
                }
            }
        }

        if (shouldSave) {
            // Save directly without name prompt
            push(gameBoardRef, {
                name: 'Player',
                score: newScore,
                date: Date.now()
            });
            // Refresh leaderboard display immediately
            let unit = '';
            if (gameId === 'memory') unit = 'moves';
            if (gameId === 'snake') unit = 'points';
            if (gameId === 'reaction') unit = 'ms';
            if (gameId === 'whack') unit = 'moles';
            if (gameId === 'bounce') unit = 'pts';
            if (gameId === 'stars') unit = 'pts';
            if (gameId === 'aim') unit = 'pts';
            if (gameId === 'flappy') unit = 'pts';
            if (gameId === 'colormatch') unit = 'pts';
            loadLeaderboard(gameId, unit);
        }
    }, { onlyOnce: true });
}


// ========================================
// 🐍 Snake Game Logic
// ========================================
let snakeCanvas, snakeCtx;
let snakeArea = 500; // Increased to 500
let gridSize = 25; // 20x20 grid for 500 canvas
let snake = [];
let food = {};
let dx = gridSize;
let dy = 0;
let snakeScore = 0;
let snakeInterval;
let snakeSpeed = 150;
let gameOverSnake = false;
let isSnakePaused = false;
let speedBurst = false;

window.startSnakeGame = function () {
    snakeCanvas = document.getElementById('snakeCanvas');
    snakeCtx = snakeCanvas.getContext('2d');

    // Reset state
    snake = [
        { x: 250, y: 250 },
        { x: 225, y: 250 },
        { x: 200, y: 250 }
    ];
    dx = gridSize;
    dy = 0;
    snakeScore = 0;
    snakeSpeed = 150;
    gameOverSnake = false;
    isSnakePaused = false;
    speedBurst = false;
    document.getElementById('snakeScore').textContent = snakeScore;
    document.getElementById('snakePauseOverlay').classList.add('hidden');
    document.getElementById('snakeGameOverOverlay').classList.add('hidden');

    createFood();
    if (snakeInterval) clearInterval(snakeInterval);
    snakeInterval = setInterval(mainSnake, snakeSpeed);
}

window.toggleSnakePause = function () {
    if (gameOverSnake || !snakeInterval) return;

    isSnakePaused = !isSnakePaused;
    const overlay = document.getElementById('snakePauseOverlay');

    if (isSnakePaused) {
        clearInterval(snakeInterval);
        overlay.classList.remove('hidden');
    } else {
        snakeInterval = setInterval(mainSnake, speedBurst ? 40 : snakeSpeed);
        overlay.classList.add('hidden');
    }
}

function mainSnake() {
    if (gameOverSnake || isSnakePaused) return;

    if (hasGameEnded()) {
        gameOverSnake = true;
        clearInterval(snakeInterval);

        // Custom Game Over UI
        document.getElementById('snakeFinalScore').textContent = snakeScore;
        document.getElementById('snakeGameOverOverlay').classList.remove('hidden');

        checkAndSaveScore('snake', snakeScore, true); // Higher is better
        return;
    }

    clearCanvas();
    drawFood();
    advanceSnake();
    drawSnake();
}

function clearCanvas() {
    snakeCtx.fillStyle = '#111827'; // tailwind gray-900 equivalent set via JS usually, but matching canvas bg
    snakeCtx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);
    snakeCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height); // explicit fill
}

function drawSnake() {
    snake.forEach(drawSnakePart);
}

function drawSnakePart(snakePart) {
    snakeCtx.fillStyle = '#4ade80'; // snake color
    snakeCtx.strokeStyle = '#166534';
    snakeCtx.fillRect(snakePart.x, snakePart.y, gridSize, gridSize);
    snakeCtx.strokeRect(snakePart.x, snakePart.y, gridSize, gridSize);
}

function advanceSnake() {
    let newX = snake[0].x + dx;
    let newY = snake[0].y + dy;

    // Wall Wrap Logic (Opposite side)
    if (newX < 0) newX = snakeArea - gridSize;
    else if (newX >= snakeArea) newX = 0;

    if (newY < 0) newY = snakeArea - gridSize;
    else if (newY >= snakeArea) newY = 0;

    const head = { x: newX, y: newY };
    snake.unshift(head);

    const hasEatenFood = head.x === food.x && head.y === food.y;
    if (hasEatenFood) {
        snakeScore += 10;
        document.getElementById('snakeScore').textContent = snakeScore;
        createFood();
        // Speed up very slightly
        if (snakeSpeed > 60) {
            snakeSpeed -= 2;
            if (!speedBurst && !isSnakePaused && !gameOverSnake) {
                clearInterval(snakeInterval);
                snakeInterval = setInterval(mainSnake, snakeSpeed);
            }
        }
    } else {
        snake.pop();
    }
}

function createFood() {
    food.x = Math.round((Math.random() * (snakeArea - gridSize)) / gridSize) * gridSize;
    food.y = Math.round((Math.random() * (snakeArea - gridSize)) / gridSize) * gridSize;

    // ensure food isnt on snake
    let onSnake = false;
    snake.forEach(function has_snake_eaten_food(part) {
        if (part.x === food.x && part.y === food.y) onSnake = true;
    });
    if (onSnake) createFood();
}

function drawFood() {
    snakeCtx.fillStyle = '#ef4444'; // red
    snakeCtx.strokeStyle = '#991b1b'; // darker red
    snakeCtx.fillRect(food.x, food.y, gridSize, gridSize);
    snakeCtx.strokeRect(food.x, food.y, gridSize, gridSize);
}

function hasGameEnded() {
    // Only Self collision
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true;
    }
    return false;
}

document.addEventListener("keydown", function (event) {
    // Only process if snake overlay is active
    if (!document.getElementById('snakeGameOverlay').classList.contains('active')) return;

    // Spacebar Pause/Resume
    if (event.code === 'Space') {
        event.preventDefault();
        window.toggleSnakePause();
        return;
    }

    if (isSnakePaused || gameOverSnake) return;

    const LEFT_KEY = 37; const A_KEY = 65;
    const RIGHT_KEY = 39; const D_KEY = 68;
    const UP_KEY = 38; const W_KEY = 87;
    const DOWN_KEY = 40; const S_KEY = 83;

    const keyPressed = event.keyCode;
    const isDirectionKey = [37, 38, 39, 40, 65, 68, 87, 83].includes(keyPressed);

    const goingUp = dy === -gridSize;
    const goingDown = dy === gridSize;
    const goingRight = dx === gridSize;
    const goingLeft = dx === -gridSize;

    if ((keyPressed === LEFT_KEY || keyPressed === A_KEY) && !goingRight) { dx = -gridSize; dy = 0; }
    if ((keyPressed === UP_KEY || keyPressed === W_KEY) && !goingDown) { dx = 0; dy = -gridSize; }
    if ((keyPressed === RIGHT_KEY || keyPressed === D_KEY) && !goingLeft) { dx = gridSize; dy = 0; }
    if ((keyPressed === DOWN_KEY || keyPressed === S_KEY) && !goingUp) { dx = 0; dy = gridSize; }

    // Speed burst on arrow key hold
    if (isDirectionKey) {
        if (!speedBurst) {
            speedBurst = true;
            clearInterval(snakeInterval);
            snakeInterval = setInterval(mainSnake, 40); // Fast speed
        }

        // Prevent scrolling default behavior
        if ([37, 38, 39, 40, 32].indexOf(event.keyCode) > -1) {
            event.preventDefault();
        }
    }
});

// Remove speed burst on key up
document.addEventListener("keyup", function (event) {
    if (!document.getElementById('snakeGameOverlay').classList.contains('active') || isSnakePaused || gameOverSnake) return;

    const isDirectionKey = [37, 38, 39, 40, 65, 68, 87, 83].includes(event.keyCode);
    if (isDirectionKey && speedBurst) {
        speedBurst = false;
        clearInterval(snakeInterval);
        snakeInterval = setInterval(mainSnake, snakeSpeed); // Normal speed
    }
});


// ========================================
// ⚡ Reaction Time Game Logic
// ========================================
let reactionTimeout;
let reactionStartTime;
let isReactionWaiting = false;
let isReactionReady = false;

window.handleReactionClick = function () {
    const area = document.getElementById('reactionArea');
    const resText = document.getElementById('reactionResult');

    if (!isReactionWaiting && !isReactionReady) {
        // Start phase
        area.style.backgroundColor = '#ef4444'; // Red
        area.textContent = "Wait for Green...";
        resText.textContent = "";
        isReactionWaiting = true;

        const randomTime = Math.floor(Math.random() * 3000) + 1500; // 1.5s to 4.5s

        reactionTimeout = setTimeout(() => {
            isReactionWaiting = false;
            isReactionReady = true;
            area.style.backgroundColor = '#22c55e'; // Green
            area.textContent = "CLICK NOW!";
            reactionStartTime = Date.now();
        }, randomTime);

    } else if (isReactionWaiting) {
        // Clicked too early
        clearTimeout(reactionTimeout);
        isReactionWaiting = false;
        area.style.backgroundColor = '#ef4444'; // Red
        area.textContent = "Too early! Click to try again.";
        resText.textContent = "Failed - Jumped the gun!";

    } else if (isReactionReady) {
        // Clicked on green
        const endTime = Date.now();
        const reactionTime = endTime - reactionStartTime;
        isReactionReady = false;

        area.style.backgroundColor = '#3b82f6'; // Blue
        area.textContent = "Click to go again";
        resText.innerHTML = `Reaction Time: <strong>${reactionTime} ms</strong>`;

        checkAndSaveScore('reaction', reactionTime, false); // Lower ms is better
    }
}


// ========================================
// 🔨 Whack-a-Mole Game Logic
// ========================================
let moles;
let whackScore = 0;
let lastMoleIdx = -1;
let moleInterval;
let whackTimer = 30; // 30 seconds
let whackTimerInterval;
let isWhackPlaying = false;

window.startWhackGame = function () {
    if (isWhackPlaying) return;

    moles = document.querySelectorAll('.mole');
    whackScore = 0;
    whackTimer = 30;
    isWhackPlaying = true;

    document.getElementById('whackScore').textContent = whackScore;
    document.getElementById('whackTime').textContent = `${whackTimer}s`;

    moleInterval = setInterval(randomMole, 800);
    whackTimerInterval = setInterval(() => {
        whackTimer--;
        document.getElementById('whackTime').textContent = `${whackTimer}s`;
        if (whackTimer <= 0) {
            endWhackGame();
        }
    }, 1000);
}

function randomMole() {
    // Hide all moles first manually in case animation lag
    moles.forEach(m => m.classList.remove('up'));

    let randomIdx;
    do {
        randomIdx = Math.floor(Math.random() * moles.length);
    } while (randomIdx === lastMoleIdx);

    lastMoleIdx = randomIdx;
    moles[randomIdx].classList.add('up');

    // Auto hide after some time
    setTimeout(() => {
        moles[randomIdx].classList.remove('up');
    }, 700);
}

window.whackMole = function (idx) {
    if (!isWhackPlaying) return;
    const mole = document.getElementById(`mole-${idx}`);

    if (mole.classList.contains('up')) {
        whackScore++;
        document.getElementById('whackScore').textContent = whackScore;
        mole.classList.remove('up');
        // add quick visual feedback on the hole container
        mole.parentElement.style.backgroundColor = '#ec4899'; // pink brief flash
        setTimeout(() => mole.parentElement.style.backgroundColor = '#451a03', 150);
    }
}

function endWhackGame() {
    clearInterval(moleInterval);
    clearInterval(whackTimerInterval);
    isWhackPlaying = false;
    moles.forEach(m => m.classList.remove('up'));

    alert(`Time's UP! You whacked ${whackScore} moles!`);
    checkAndSaveScore('whack', whackScore, true); // Higher is better
}

// ========================================
// 🎾 Bounce Ball Game Logic
// ========================================
let bounceCanvas, bounceCtx;
let bounceInterval;
let gameOverBounce = false;
let isBouncePaused = false;
let bounceScore = 0;

// Level System
let bounceLevel = 'easy';
const bounceLevels = {
    easy: { speed: 4, paddleWidth: 120, pointMultiplier: 1, shrinkRate: 1, speedUp: 0.3, color: '#4ade80', label: 'Easy — 1x pts', ballColor: '#86efac', paddleColor: '#4ade80', borderColor: '#4ade80', bgColor: '#0a1f0a' },
    medium: { speed: 8, paddleWidth: 90, pointMultiplier: 2, shrinkRate: 2, speedUp: 0.6, color: '#facc15', label: 'Medium — 2x pts', ballColor: '#22c55e', paddleColor: '#16a34a', borderColor: '#16a34a', bgColor: '#0a170a' },
    hard: { speed: 14, paddleWidth: 45, pointMultiplier: 5, shrinkRate: 4, speedUp: 1.2, color: '#f87171', label: 'Hard — 5x pts \ud83d\udd25', ballColor: '#15803d', paddleColor: '#166534', borderColor: '#14532d', bgColor: '#030f03' }
};

const ball = {
    x: 200,
    y: 200,
    radius: 10,
    dx: 4,
    dy: -4,
    speed: 4,
    color: '#06b6d4' // cyan-500
};

const paddle = {
    width: 100,
    height: 14,
    x: 200,
    y: 470,
    dx: 10,
    color: '#0ea5e9' // sky-500
};

let rightPressed = false;
let leftPressed = false;

window.setBounceLevel = function (level) {
    bounceLevel = level;
    const info = bounceLevels[level];

    // Update UI highlights
    ['bounceEasyBtn', 'bounceMediumBtn', 'bounceHardBtn'].forEach(id => {
        document.getElementById(id).classList.remove('ring-2', 'ring-green-400', 'ring-yellow-400', 'ring-red-400');
        document.getElementById(id).classList.add('ring-0');
    });

    const btnId = level === 'easy' ? 'bounceEasyBtn' : level === 'medium' ? 'bounceMediumBtn' : 'bounceHardBtn';
    const ringColor = level === 'easy' ? 'ring-green-400' : level === 'medium' ? 'ring-yellow-400' : 'ring-red-400';
    document.getElementById(btnId).classList.remove('ring-0');
    document.getElementById(btnId).classList.add('ring-2', ringColor);

    // Update info text
    const infoElem = document.getElementById('bounceLevelInfo');
    infoElem.textContent = info.label;
    infoElem.style.color = info.color;

    // Update canvas border color to match level theme
    const canvas = document.getElementById('bounceCanvas');
    if (canvas) {
        canvas.style.borderColor = info.borderColor;
    }

    // Auto-restart game with new level settings
    window.startBounceGame();
}

window.startBounceGame = function () {
    bounceCanvas = document.getElementById('bounceCanvas');
    bounceCtx = bounceCanvas.getContext('2d');

    const levelConfig = bounceLevels[bounceLevel];

    // Reset State based on level
    ball.x = bounceCanvas.width / 2;
    ball.y = bounceCanvas.height / 2;
    ball.speed = levelConfig.speed;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.dy = -ball.speed;
    ball.color = levelConfig.ballColor;

    paddle.width = levelConfig.paddleWidth;
    paddle.color = levelConfig.paddleColor;
    paddle.x = (bounceCanvas.width - paddle.width) / 2;

    bounceScore = 0;
    gameOverBounce = false;
    isBouncePaused = false;
    rightPressed = false;
    leftPressed = false;

    document.getElementById('bounceScore').textContent = bounceScore;
    document.getElementById('bouncePauseOverlay').classList.add('hidden');
    document.getElementById('bounceGameOverOverlay').classList.add('hidden');

    if (bounceInterval) clearInterval(bounceInterval);
    bounceInterval = setInterval(drawBounceGame, 16); // ~60fps
}

window.toggleBouncePause = function () {
    if (gameOverBounce || !bounceInterval) return;

    isBouncePaused = !isBouncePaused;
    const overlay = document.getElementById('bouncePauseOverlay');

    if (isBouncePaused) {
        clearInterval(bounceInterval);
        overlay.classList.remove('hidden');
    } else {
        bounceInterval = setInterval(drawBounceGame, 16);
        overlay.classList.add('hidden');
    }
}

function drawBall() {
    bounceCtx.beginPath();
    bounceCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    bounceCtx.fillStyle = ball.color;
    bounceCtx.fill();
    bounceCtx.closePath();
}

function drawPaddle() {
    bounceCtx.beginPath();
    bounceCtx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
    bounceCtx.fillStyle = paddle.color;
    bounceCtx.fill();
    bounceCtx.closePath();
}

function drawBounceGame() {
    if (gameOverBounce || isBouncePaused) return;

    bounceCtx.fillStyle = bounceLevels[bounceLevel].bgColor;
    bounceCtx.fillRect(0, 0, bounceCanvas.width, bounceCanvas.height);

    drawBall();
    drawPaddle();

    // Wall Collision (Left & Right)
    if (ball.x + ball.dx > bounceCanvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
    }

    // Wall Collision (Top)
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
    }
    // Paddle Collision or Bottom Edge
    else if (ball.y + ball.dy + ball.radius >= paddle.y) {
        // Check if ball is within paddle's horizontal range
        if (ball.x + ball.radius > paddle.x && ball.x - ball.radius < paddle.x + paddle.width) {

            // Rebound physics
            let hitPoint = ball.x - (paddle.x + paddle.width / 2);
            let normalizedHit = hitPoint / (paddle.width / 2); // -1 to 1

            ball.dy = -Math.abs(ball.dy); // Always bounce UP
            ball.dx = normalizedHit * ball.speed * 1.2;

            const levelConfig = bounceLevels[bounceLevel];
            bounceScore += levelConfig.pointMultiplier;
            document.getElementById('bounceScore').textContent = bounceScore;

            if (bounceScore % (5 * levelConfig.pointMultiplier) === 0) {
                ball.speed += levelConfig.speedUp;
                const currentSpeedSq = ball.dx * ball.dx + ball.dy * ball.dy;
                const speedScale = ball.speed / Math.sqrt(currentSpeedSq);
                ball.dx *= speedScale;
                ball.dy *= speedScale;

                if (paddle.width > 40) paddle.width -= levelConfig.shrinkRate;
            }
            // Clamp ball above paddle to prevent pass-through
            ball.y = paddle.y - ball.radius;

        } else if (ball.y + ball.dy > bounceCanvas.height - ball.radius) {
            // Ball missed paddle and hit the bottom — Game Over
            gameOverBounce = true;
            clearInterval(bounceInterval);

            document.getElementById('bounceFinalScore').textContent = bounceScore;
            document.getElementById('bounceGameOverOverlay').classList.remove('hidden');

            checkAndSaveScore('bounce', bounceScore, true);
            return;
        }
    }

    // Move Ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Move Paddle
    if (rightPressed && paddle.x < bounceCanvas.width - paddle.width) {
        paddle.x += paddle.dx;
    } else if (leftPressed && paddle.x > 0) {
        paddle.x -= paddle.dx;
    }
}

document.addEventListener("mousemove", function (e) {
    const overlay = document.getElementById('bounceGameOverlay');
    if (!overlay || !overlay.classList.contains('active') || isBouncePaused || gameOverBounce) return;

    if (bounceCanvas) {
        const rect = bounceCanvas.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;

        if (relativeX > 0 && relativeX < bounceCanvas.width) {
            paddle.x = relativeX - paddle.width / 2;
            if (paddle.x < 0) paddle.x = 0;
            if (paddle.x + paddle.width > bounceCanvas.width) paddle.x = bounceCanvas.width - paddle.width;
        }
    }
});

document.addEventListener("keydown", function (e) {
    const overlay = document.getElementById('bounceGameOverlay');
    if (!overlay || !overlay.classList.contains('active')) return;

    if (e.code === 'Space') {
        e.preventDefault();
        window.toggleBouncePause();
        return;
    }

    if (isBouncePaused || gameOverBounce) return;

    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
});

document.addEventListener("keyup", function (e) {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
});


// ========================================
// ✨ Falling Stars Game Logic
// ========================================
let starsCanvas, starsCtx;
let starsInterval;
let gameOverStars = false;
let isStarsPaused = false;
let starsScore = 0;
let starsLives = 3;

let items = []; // falling objects
let starsFrame = 0;
let starsDifficulty = 1;

const basket = {
    width: 70,
    height: 22,
    x: 215,
    y: 460,
    color: '#f472b6' // pink-400
};

let basketTargetX = 215; // For smooth following

window.startStarsGame = function () {
    starsCanvas = document.getElementById('starsCanvas');
    starsCtx = starsCanvas.getContext('2d');

    starsScore = 0;
    starsLives = 3;
    items = [];
    starsFrame = 0;
    starsDifficulty = 1;
    gameOverStars = false;
    isStarsPaused = false;
    basketTargetX = (starsCanvas.width - basket.width) / 2;
    basket.x = basketTargetX;

    updateStarsUI();
    document.getElementById('starsPauseOverlay').classList.add('hidden');
    document.getElementById('starsGameOverOverlay').classList.add('hidden');

    if (starsInterval) clearInterval(starsInterval);
    starsInterval = setInterval(drawStarsGame, 20); // 50fps
}

window.toggleStarsPause = function () {
    if (gameOverStars || !starsInterval) return;

    isStarsPaused = !isStarsPaused;
    const overlay = document.getElementById('starsPauseOverlay');

    if (isStarsPaused) {
        clearInterval(starsInterval);
        overlay.classList.remove('hidden');
    } else {
        starsInterval = setInterval(drawStarsGame, 20);
        overlay.classList.add('hidden');
    }
}

function updateStarsUI() {
    document.getElementById('starsScore').textContent = starsScore;
    let heartStr = '';
    for (let i = 0; i < starsLives; i++) heartStr += '💖';
    document.getElementById('starsLives').textContent = `Lives: ${heartStr}`;
}

function spawnItem() {
    const isBomb = Math.random() < 0.2 + (starsDifficulty * 0.05); // More bombs as diff increases
    const isGolden = !isBomb && Math.random() < 0.1; // Rare golden star

    let type = 'star';
    let color = '#fef08a'; // yellow-200
    let points = 1;
    let radius = 8;

    if (isBomb) {
        type = 'bomb';
        color = '#ef4444'; // red-500
        points = -1;
        radius = 10;
    } else if (isGolden) {
        type = 'golden';
        color = '#a855f7'; // purple-500
        points = 5;
        radius = 12;
    }

    items.push({
        x: Math.random() * (starsCanvas.width - radius * 2) + radius,
        y: -20,
        radius: radius,
        speed: (Math.random() * 2 + 2) + starsDifficulty,
        type: type,
        color: color,
        points: points
    });
}

function drawStarsGame() {
    if (gameOverStars || isStarsPaused) return;

    starsFrame++;

    // Increase difficulty every 500 frames (~10s) up to a max limit
    if (starsFrame % 500 === 0 && starsDifficulty < 5) {
        starsDifficulty += 0.5;
        // shrink basket slightly
        if (basket.width > 30) basket.width -= 5;
    }

    // Spawn items based on difficulty rate
    let spawnRate = Math.max(20, 50 - (starsDifficulty * 5));
    if (starsFrame % spawnRate === 0) {
        spawnItem();
    }

    starsCtx.fillStyle = '#111827';
    starsCtx.fillRect(0, 0, starsCanvas.width, starsCanvas.height);

    // Smooth basket movement (Lerp)
    basket.x += (basketTargetX - basket.x) * 0.2;

    // Draw Basket
    starsCtx.fillStyle = basket.color;
    starsCtx.beginPath();
    starsCtx.moveTo(basket.x, basket.y);
    starsCtx.lineTo(basket.x + basket.width, basket.y);
    starsCtx.lineTo(basket.x + basket.width - 5, basket.y + basket.height);
    starsCtx.lineTo(basket.x + 5, basket.y + basket.height);
    starsCtx.closePath();
    starsCtx.fill();

    // Move & Draw Items
    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i];
        it.y += it.speed;

        // Draw item
        starsCtx.beginPath();
        if (it.type === 'star' || it.type === 'golden') {
            // Draw a basic star shape using arc for simplicity but distinct color
            starsCtx.fillStyle = it.color;
            starsCtx.arc(it.x, it.y, it.radius, 0, Math.PI * 2);
            starsCtx.fill();
        } else {
            // Draw Bomb
            starsCtx.fillStyle = it.color;
            starsCtx.arc(it.x, it.y, it.radius, 0, Math.PI * 2);
            starsCtx.fill();
            // Bomb fuse
            starsCtx.strokeStyle = '#d1d5db';
            starsCtx.beginPath();
            starsCtx.moveTo(it.x, it.y - it.radius);
            starsCtx.lineTo(it.x + 5, it.y - it.radius - 5);
            starsCtx.stroke();
        }

        // Collision detection with basket
        if (it.y + it.radius >= basket.y && it.y - it.radius <= basket.y + basket.height) {
            if (it.x + it.radius >= basket.x && it.x - it.radius <= basket.x + basket.width) {
                // Caught!
                if (it.type === 'bomb') {
                    starsLives--;
                    // Flash screen red
                    starsCtx.fillStyle = 'rgba(239, 68, 68, 0.4)';
                    starsCtx.fillRect(0, 0, starsCanvas.width, starsCanvas.height);
                } else {
                    starsScore += it.points;
                }

                updateStarsUI();
                items.splice(i, 1);

                if (starsLives <= 0) {
                    gameOverStarsPhase();
                    return;
                }
                continue;
            }
        }

        // Missed item (hit floor)
        if (it.y > starsCanvas.height + it.radius) {
            if (it.type === 'star' || it.type === 'golden') {
                // Penalize for missing good items by losing half a life, or just ignore. 
                // Let's just deduct a point so it's not too punishing, but prevent going negative.
                if (starsScore > 0) {
                    starsScore--;
                    updateStarsUI();
                }
            }
            items.splice(i, 1);
        }
    }
}

function gameOverStarsPhase() {
    gameOverStars = true;
    clearInterval(starsInterval);

    document.getElementById('starsFinalScore').textContent = starsScore;
    document.getElementById('starsGameOverOverlay').classList.remove('hidden');

    checkAndSaveScore('stars', starsScore, true);
}

// Controls
document.addEventListener("mousemove", function (e) {
    const overlay = document.getElementById('starsGameOverlay');
    if (!overlay || !overlay.classList.contains('active') || isStarsPaused || gameOverStars) return;

    if (starsCanvas) {
        const rect = starsCanvas.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;

        if (relativeX > 0 && relativeX < starsCanvas.width) {
            basketTargetX = relativeX - basket.width / 2;
            if (basketTargetX < 0) basketTargetX = 0;
            if (basketTargetX + basket.width > starsCanvas.width) basketTargetX = starsCanvas.width - basket.width;
        }
    }
});

document.addEventListener("keydown", function (e) {
    const overlay = document.getElementById('starsGameOverlay');
    if (!overlay || !overlay.classList.contains('active')) return;

    if (e.code === 'Space') {
        e.preventDefault();
        window.toggleStarsPause();
    }
});
// #endregion

// #region 🔒 AIM TRAINER GAME
// ========================================
// 🎯 Aim Trainer Game Logic
// ========================================
let aimCanvas, aimCtx;
let aimTimerInterval;
let aimGameActive = false;
let aimScore = 0;
let aimTimeLeft = 30;
let aimHits = 0;
let aimMisses = 0;
let aimTarget = null;
let aimAnimations = []; // for hit effects
const AIM_TARGET_LIFETIME = 1500; // target disappears after 1.5 seconds!
const AIM_MISS_PENALTY = 3; // lose 3 pts for miss

function spawnAimTarget() {
    // Targets get smaller as score increases (progressive difficulty)
    const difficultyBonus = Math.min(aimScore * 0.15, 12);
    const minRadius = Math.max(6, 10 - difficultyBonus * 0.3);
    const maxRadius = Math.max(18, 30 - difficultyBonus);
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const x = radius + Math.random() * (aimCanvas.width - radius * 2);
    const y = radius + Math.random() * (aimCanvas.height - radius * 2);

    // Color based on size — smaller = more red/valuable
    const sizeRatio = (radius - minRadius) / (maxRadius - minRadius + 0.01);
    const r = Math.floor(255 - sizeRatio * 100);
    const g = Math.floor(80 + sizeRatio * 120);
    const b = Math.floor(50 + sizeRatio * 50);

    aimTarget = { x, y, radius, color: `rgb(${r},${g},${b})`, spawnTime: Date.now() };
}

function getAimPoints(radius) {
    // Smaller targets = more points (8 to 30)
    return Math.max(8, Math.round(35 - radius * 0.9));
}

function drawAimGame() {
    if (!aimCtx) return;
    aimCtx.fillStyle = '#111827';
    aimCtx.fillRect(0, 0, aimCanvas.width, aimCanvas.height);

    // Draw grid lines for aim feel
    aimCtx.strokeStyle = 'rgba(255,255,255,0.03)';
    aimCtx.lineWidth = 1;
    for (let i = 0; i < aimCanvas.width; i += 50) {
        aimCtx.beginPath();
        aimCtx.moveTo(i, 0);
        aimCtx.lineTo(i, aimCanvas.height);
        aimCtx.stroke();
        aimCtx.beginPath();
        aimCtx.moveTo(0, i);
        aimCtx.lineTo(aimCanvas.width, i);
        aimCtx.stroke();
    }

    // Draw target
    if (aimTarget) {
        // Check if target expired (auto-disappear)
        const timeAlive = Date.now() - aimTarget.spawnTime;
        if (timeAlive > AIM_TARGET_LIFETIME) {
            // Target expired = counts as miss!
            aimMisses++;
            aimAnimations.push({ x: aimTarget.x, y: aimTarget.y, radius: aimTarget.radius, time: Date.now(), hit: false, points: 0 });
            const accuracy = aimHits + aimMisses > 0 ? Math.round((aimHits / (aimHits + aimMisses)) * 100) : 0;
            document.getElementById('aimAccuracy').textContent = accuracy + '%';
            spawnAimTarget();
        }

        // Timer ring (shrinks as time runs out)
        const lifeRatio = Math.max(0, 1 - timeAlive / AIM_TARGET_LIFETIME);
        aimCtx.beginPath();
        aimCtx.arc(aimTarget.x, aimTarget.y, aimTarget.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifeRatio);
        aimCtx.strokeStyle = lifeRatio > 0.4 ? `rgba(74,222,128,${lifeRatio})` : `rgba(239,68,68,${1 - lifeRatio})`;
        aimCtx.lineWidth = 3;
        aimCtx.stroke();
        // Outer glow
        aimCtx.beginPath();
        aimCtx.arc(aimTarget.x, aimTarget.y, aimTarget.radius + 4, 0, Math.PI * 2);
        aimCtx.fillStyle = 'rgba(255, 100, 50, 0.15)';
        aimCtx.fill();

        // Main circle
        aimCtx.beginPath();
        aimCtx.arc(aimTarget.x, aimTarget.y, aimTarget.radius, 0, Math.PI * 2);
        aimCtx.fillStyle = aimTarget.color;
        aimCtx.fill();

        // Inner ring
        aimCtx.beginPath();
        aimCtx.arc(aimTarget.x, aimTarget.y, aimTarget.radius * 0.5, 0, Math.PI * 2);
        aimCtx.strokeStyle = 'rgba(255,255,255,0.5)';
        aimCtx.lineWidth = 2;
        aimCtx.stroke();

        // Bullseye dot
        aimCtx.beginPath();
        aimCtx.arc(aimTarget.x, aimTarget.y, 3, 0, Math.PI * 2);
        aimCtx.fillStyle = '#fff';
        aimCtx.fill();

        // Points label
        const pts = getAimPoints(aimTarget.radius);
        aimCtx.fillStyle = '#fff';
        aimCtx.font = 'bold 11px sans-serif';
        aimCtx.textAlign = 'center';
        aimCtx.fillText(`+${pts}`, aimTarget.x, aimTarget.y - aimTarget.radius - 8);
    }

    // Draw hit animations
    aimAnimations = aimAnimations.filter(a => {
        const elapsed = Date.now() - a.time;
        if (elapsed > 400) return false;
        const alpha = 1 - elapsed / 400;
        const expand = a.radius + elapsed * 0.15;

        aimCtx.beginPath();
        aimCtx.arc(a.x, a.y, expand, 0, Math.PI * 2);
        aimCtx.strokeStyle = a.hit ? `rgba(74,222,128,${alpha})` : `rgba(239,68,68,${alpha})`;
        aimCtx.lineWidth = 3;
        aimCtx.stroke();

        if (a.hit) {
            aimCtx.fillStyle = `rgba(74,222,128,${alpha})`;
            aimCtx.font = `bold ${14 + elapsed * 0.03}px sans-serif`;
            aimCtx.textAlign = 'center';
            aimCtx.fillText(`+${a.points}`, a.x, a.y - expand - 5);
        }
        return true;
    });

    if (aimGameActive) {
        requestAnimationFrame(drawAimGame);
    }
}

window.startAimGame = function () {
    aimCanvas = document.getElementById('aimCanvas');
    aimCtx = aimCanvas.getContext('2d');

    aimScore = 0;
    aimTimeLeft = 30;
    aimHits = 0;
    aimMisses = 0;
    aimGameActive = true;
    aimAnimations = [];

    document.getElementById('aimScore').textContent = aimScore;
    document.getElementById('aimTimer').textContent = aimTimeLeft;
    document.getElementById('aimAccuracy').textContent = '0%';
    document.getElementById('aimGameOverOverlay').classList.add('hidden');

    spawnAimTarget();

    if (aimTimerInterval) clearInterval(aimTimerInterval);
    aimTimerInterval = setInterval(() => {
        aimTimeLeft--;
        document.getElementById('aimTimer').textContent = aimTimeLeft;

        if (aimTimeLeft <= 0) {
            clearInterval(aimTimerInterval);
            aimGameActive = false;

            const accuracy = aimHits + aimMisses > 0 ? Math.round((aimHits / (aimHits + aimMisses)) * 100) : 0;
            document.getElementById('aimFinalScore').textContent = aimScore;
            document.getElementById('aimFinalAccuracy').textContent = accuracy + '%';
            document.getElementById('aimGameOverOverlay').classList.remove('hidden');

            checkAndSaveScore('aim', aimScore, true);
        }
    }, 1000);

    drawAimGame();
}

// Handle clicks on canvas
document.addEventListener('DOMContentLoaded', function () {
    const setupAimCanvas = () => {
        const canvas = document.getElementById('aimCanvas');
        if (!canvas) return;

        canvas.addEventListener('click', function (e) {
            if (!aimGameActive || !aimTarget) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;

            const dist = Math.sqrt((clickX - aimTarget.x) ** 2 + (clickY - aimTarget.y) ** 2);

            if (dist <= aimTarget.radius) {
                // HIT!
                const points = getAimPoints(aimTarget.radius);
                aimScore += points;
                aimHits++;
                aimAnimations.push({ x: aimTarget.x, y: aimTarget.y, radius: aimTarget.radius, time: Date.now(), hit: true, points });

                document.getElementById('aimScore').textContent = aimScore;
                spawnAimTarget();
            } else {
                // MISS — penalty!
                aimMisses++;
                aimScore = Math.max(0, aimScore - AIM_MISS_PENALTY);
                document.getElementById('aimScore').textContent = aimScore;
                aimAnimations.push({ x: clickX, y: clickY, radius: 10, time: Date.now(), hit: false, points: 0 });
            }

            // Update accuracy
            const accuracy = aimHits + aimMisses > 0 ? Math.round((aimHits / (aimHits + aimMisses)) * 100) : 0;
            document.getElementById('aimAccuracy').textContent = accuracy + '%';
        });
    };
    setupAimCanvas();
});
// #endregion

// #region 🔒 FLAPPY BIRD GAME
// ========================================
// 🐦 Flappy Bird Game Logic
// ========================================
let flappyCanvas, flappyCtx;
let flappyInterval;
let flappyGameActive = false;
let flappyGameOver = false;
let flappyStarted = false;
let flappyScore = 0;
let flappyLastTime = 0;
let flappyAnimFrame = null;

// Level System
let flappyLevel = 'medium';
const flappyLevels = {
    easy: { gravity: 0.25, flapForce: -5.5, pipeSpeed: 1.8, pipeGap: 175, pipeInterval: 110, color: '#4ade80', label: 'Easy — Slow & Wide' },
    medium: { gravity: 0.35, flapForce: -6.5, pipeSpeed: 2.5, pipeGap: 145, pipeInterval: 90, color: '#facc15', label: 'Medium — Normal' },
    hard: { gravity: 0.50, flapForce: -8.0, pipeSpeed: 4.0, pipeGap: 110, pipeInterval: 65, color: '#f87171', label: 'Hard — Fast & Tight 🔥' }
};

const bird = { x: 80, y: 250, width: 30, height: 24, velocity: 0, gravity: 0.35, flapForce: -6.5 };
let pipes = [];
const PIPE_WIDTH = 50;
let currentPipeGap = 145;
let currentPipeSpeed = 2.5;
let currentPipeInterval = 90;
let pipeTimer = 0;

function resetBird() {
    bird.y = 250;
    bird.velocity = 0;
    pipes = [];
    pipeTimer = 0;
}

window.setFlappyLevel = function (level) {
    flappyLevel = level;
    const info = flappyLevels[level];

    // Update UI highlights
    ['flappyEasyBtn', 'flappyMediumBtn', 'flappyHardBtn'].forEach(id => {
        document.getElementById(id).classList.remove('ring-2', 'ring-green-400', 'ring-yellow-400', 'ring-red-400');
        document.getElementById(id).classList.add('ring-0');
    });

    const btnId = level === 'easy' ? 'flappyEasyBtn' : level === 'medium' ? 'flappyMediumBtn' : 'flappyHardBtn';
    const ringColor = level === 'easy' ? 'ring-green-400' : level === 'medium' ? 'ring-yellow-400' : 'ring-red-400';
    document.getElementById(btnId).classList.remove('ring-0');
    document.getElementById(btnId).classList.add('ring-2', ringColor);

    const infoElem = document.getElementById('flappyLevelInfo');
    infoElem.textContent = info.label;
    infoElem.style.color = info.color;

    // Auto-restart
    window.startFlappyGame();
}

window.flappyFlap = function () {
    if (flappyGameOver) return;
    if (!flappyStarted) {
        flappyStarted = true;
        document.getElementById('flappyStartOverlay').classList.add('hidden');
    }
    bird.velocity = bird.flapForce;
}

window.startFlappyGame = function () {
    flappyCanvas = document.getElementById('flappyCanvas');
    flappyCtx = flappyCanvas.getContext('2d');

    const levelConfig = flappyLevels[flappyLevel];

    // Apply level settings
    bird.gravity = levelConfig.gravity;
    bird.flapForce = levelConfig.flapForce;
    currentPipeSpeed = levelConfig.pipeSpeed;
    currentPipeGap = levelConfig.pipeGap;
    currentPipeInterval = levelConfig.pipeInterval;

    flappyScore = 0;
    flappyGameOver = false;
    flappyGameActive = true;
    flappyStarted = false;
    flappyLastTime = 0;
    resetBird();

    document.getElementById('flappyScore').textContent = 0;
    document.getElementById('flappyGameOverOverlay').classList.add('hidden');
    document.getElementById('flappyStartOverlay').classList.remove('hidden');

    if (flappyAnimFrame) cancelAnimationFrame(flappyAnimFrame);
    flappyAnimFrame = requestAnimationFrame(flappyGameLoop);
}

function flappyGameLoop(timestamp) {
    if (!flappyGameActive) return;
    if (!flappyLastTime) flappyLastTime = timestamp;
    const delta = Math.min((timestamp - flappyLastTime) / 16.67, 2); // normalize to ~60fps, cap at 2x
    flappyLastTime = timestamp;

    drawFlappyGame(delta);

    if (flappyGameActive && !flappyGameOver) {
        flappyAnimFrame = requestAnimationFrame(flappyGameLoop);
    }
}

function drawFlappyGame(delta) {
    if (!flappyCtx) return;
    const d = delta || 1;
    const W = flappyCanvas.width;
    const H = flappyCanvas.height;

    // Sky gradient background
    const grad = flappyCtx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0c4a6e');
    grad.addColorStop(1, '#164e63');
    flappyCtx.fillStyle = grad;
    flappyCtx.fillRect(0, 0, W, H);

    // Ground
    flappyCtx.fillStyle = '#854d0e';
    flappyCtx.fillRect(0, H - 30, W, 30);
    flappyCtx.fillStyle = '#65a30d';
    flappyCtx.fillRect(0, H - 30, W, 6);

    if (flappyStarted && !flappyGameOver) {
        // Gravity with delta-time
        bird.velocity += bird.gravity * d;
        bird.y += bird.velocity * d;

        // Pipes
        pipeTimer++;
        if (pipeTimer > currentPipeInterval) {
            pipeTimer = 0;
            const topHeight = 60 + Math.random() * (H - currentPipeGap - 120);
            pipes.push({ x: W, topHeight, passed: false });
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= currentPipeSpeed * d;

            // Score when passed
            if (!pipes[i].passed && pipes[i].x + PIPE_WIDTH < bird.x) {
                pipes[i].passed = true;
                flappyScore++;
                document.getElementById('flappyScore').textContent = flappyScore;
            }

            // Remove off-screen pipes
            if (pipes[i].x + PIPE_WIDTH < 0) {
                pipes.splice(i, 1);
            }
        }

        // Collision detection
        const birdTop = bird.y;
        const birdBot = bird.y + bird.height;
        const birdRight = bird.x + bird.width;

        // Floor/ceiling
        if (birdBot >= H - 30 || birdTop <= 0) {
            endFlappyGame();
        }

        // Pipe collision
        for (const pipe of pipes) {
            if (birdRight > pipe.x && bird.x < pipe.x + PIPE_WIDTH) {
                if (birdTop < pipe.topHeight || birdBot > pipe.topHeight + currentPipeGap) {
                    endFlappyGame();
                }
            }
        }
    }

    // Draw pipes
    for (const pipe of pipes) {
        // Top pipe
        flappyCtx.fillStyle = '#16a34a';
        flappyCtx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        flappyCtx.fillStyle = '#15803d';
        flappyCtx.fillRect(pipe.x - 4, pipe.topHeight - 20, PIPE_WIDTH + 8, 20);

        // Bottom pipe
        const bottomY = pipe.topHeight + currentPipeGap;
        flappyCtx.fillStyle = '#16a34a';
        flappyCtx.fillRect(pipe.x, bottomY, PIPE_WIDTH, H - bottomY - 30);
        flappyCtx.fillStyle = '#15803d';
        flappyCtx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 20);
    }

    // Draw bird
    flappyCtx.fillStyle = '#facc15';
    flappyCtx.beginPath();
    const angle = Math.min(Math.max(bird.velocity * 3, -30), 60) * Math.PI / 180;
    flappyCtx.save();
    flappyCtx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    flappyCtx.rotate(angle);
    flappyCtx.ellipse(0, 0, bird.width / 2, bird.height / 2, 0, 0, Math.PI * 2);
    flappyCtx.fill();

    // Eye
    flappyCtx.fillStyle = '#fff';
    flappyCtx.beginPath();
    flappyCtx.arc(8, -4, 5, 0, Math.PI * 2);
    flappyCtx.fill();
    flappyCtx.fillStyle = '#000';
    flappyCtx.beginPath();
    flappyCtx.arc(9, -4, 2.5, 0, Math.PI * 2);
    flappyCtx.fill();

    // Beak
    flappyCtx.fillStyle = '#f97316';
    flappyCtx.beginPath();
    flappyCtx.moveTo(bird.width / 2, 0);
    flappyCtx.lineTo(bird.width / 2 + 10, 3);
    flappyCtx.lineTo(bird.width / 2, 6);
    flappyCtx.closePath();
    flappyCtx.fill();
    flappyCtx.restore();

    // Score display on canvas
    flappyCtx.fillStyle = '#fff';
    flappyCtx.font = 'bold 36px sans-serif';
    flappyCtx.textAlign = 'center';
    flappyCtx.fillText(flappyScore, W / 2, 50);
}

function endFlappyGame() {
    flappyGameOver = true;
    if (flappyAnimFrame) cancelAnimationFrame(flappyAnimFrame);
    flappyGameActive = false;

    document.getElementById('flappyFinalScore').textContent = flappyScore;
    document.getElementById('flappyGameOverOverlay').classList.remove('hidden');

    checkAndSaveScore('flappy', flappyScore, true);
}

// Keyboard support for Flappy
document.addEventListener('keydown', function (e) {
    const overlay = document.getElementById('flappyGameOverlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    if (e.code === 'Space') {
        e.preventDefault();
        window.flappyFlap();
    }
});
// #endregion

// #region 🔒 COLOR MATCH GAME
// ========================================
// 🎨 Color Match Game Logic
// ========================================
let colorMatchTimerInterval;
let colorMatchActive = false;
let colorMatchScore = 0;
let colorMatchTimeLeft = 30;
let colorMatchHits = 0;
let colorMatchMisses = 0;
let colorMatchStreak = 0;
let currentColorAnswer = '';

const CM_COLORS = [
    { name: 'red', hex: '#ef4444' },
    { name: 'blue', hex: '#3b82f6' },
    { name: 'green', hex: '#22c55e' },
    { name: 'yellow', hex: '#eab308' }
];

function generateColorMatchRound() {
    // Pick a random WORD (text content)
    const wordColor = CM_COLORS[Math.floor(Math.random() * CM_COLORS.length)];
    // Pick a DIFFERENT display color
    let displayColor;
    do {
        displayColor = CM_COLORS[Math.floor(Math.random() * CM_COLORS.length)];
    } while (displayColor.name === wordColor.name);

    currentColorAnswer = displayColor.name; // correct answer is the DISPLAY color

    const wordElem = document.getElementById('colorWord');
    wordElem.textContent = wordColor.name.toUpperCase();
    wordElem.style.color = displayColor.hex;
    wordElem.style.textShadow = `0 0 30px ${displayColor.hex}40`;
}

window.pickColor = function (colorName) {
    if (!colorMatchActive) return;

    if (colorName === currentColorAnswer) {
        // CORRECT!
        colorMatchHits++;
        colorMatchStreak++;
        const streakBonus = colorMatchStreak >= 3 ? 2 : 1;
        colorMatchScore += 10 * streakBonus;

        // Flash green on word
        const wordElem = document.getElementById('colorWord');
        wordElem.style.textShadow = '0 0 40px #22c55e';
        setTimeout(() => { wordElem.style.textShadow = `0 0 30px ${currentColorAnswer}40`; }, 150);
    } else {
        // WRONG!
        colorMatchMisses++;
        colorMatchStreak = 0;
        colorMatchScore = Math.max(0, colorMatchScore - 5);

        // Flash red
        const wordElem = document.getElementById('colorWord');
        wordElem.style.textShadow = '0 0 40px #ef4444';
        setTimeout(() => { wordElem.style.textShadow = `0 0 30px ${currentColorAnswer}40`; }, 150);
    }

    document.getElementById('colorMatchScore').textContent = colorMatchScore;
    document.getElementById('colorMatchStreak').textContent = colorMatchStreak;
    generateColorMatchRound();
}

window.startColorMatchGame = function () {
    colorMatchScore = 0;
    colorMatchTimeLeft = 30;
    colorMatchHits = 0;
    colorMatchMisses = 0;
    colorMatchStreak = 0;
    colorMatchActive = true;

    document.getElementById('colorMatchScore').textContent = 0;
    document.getElementById('colorMatchTimer').textContent = 30;
    document.getElementById('colorMatchStreak').textContent = 0;
    document.getElementById('colorMatchGameOver').classList.add('hidden');

    generateColorMatchRound();

    if (colorMatchTimerInterval) clearInterval(colorMatchTimerInterval);
    colorMatchTimerInterval = setInterval(() => {
        colorMatchTimeLeft--;
        document.getElementById('colorMatchTimer').textContent = colorMatchTimeLeft;

        if (colorMatchTimeLeft <= 0) {
            clearInterval(colorMatchTimerInterval);
            colorMatchActive = false;

            const accuracy = colorMatchHits + colorMatchMisses > 0 ? Math.round((colorMatchHits / (colorMatchHits + colorMatchMisses)) * 100) : 0;
            document.getElementById('colorMatchFinalScore').textContent = colorMatchScore;
            document.getElementById('colorMatchFinalAccuracy').textContent = accuracy + '%';
            document.getElementById('colorMatchGameOver').classList.remove('hidden');

            checkAndSaveScore('colormatch', colorMatchScore, true);
        }
    }, 1000);
}
// #endregion

// ========================================
// 🚀 Quick Links - Open All Regular Links
// ========================================
window.openQuickLinks = function () {
    const password = prompt('🔒 Enter Password to open Quick Links:');
    if (password !== 'shivangpb') {
        if (password !== null) alert('❌ Wrong Password!');
        return;
    }

    // Links in order: chrome://flags first, then others, BMS dashboard last
    // Reversed order: chrome://flags (clipboard) → matrix → sheets → forms → textbook → CVANG → chat → BMS (last)
    const links = [
        'https://matrixdashboard.policybazaar.com/admin/realtimedashboard',
        'https://docs.google.com/spreadsheets/d/1wq1xc_L5DHRzYnHXeHc6SRaum8BBwWn5ntKbZafVHtk/edit?gid=0#gid=0',
        'https://docs.google.com/forms/d/e/1FAIpQLScliXNbSsS85LhQiiFDkQXGBgJIHon2ByR9Wm0X9j4BUqedVg/formResponse',
        'https://ntqueprince.github.io/textbook/',
        'https://ntqueprince.github.io/CVANG_VAHAN/',
        'https://chatinternal.policybazaar.com/channel/6854fee0f93b60e3e7de14ca',
        'https://bms.policybazaar.com/dashboardV3'
    ];

    // Note: chrome://flags/ cannot be opened via window.open() due to browser security.
    // Copy it to clipboard so user can paste in address bar.
    try {
        navigator.clipboard.writeText('chrome://flags/');
        alert('✅ "chrome://flags/" copied to clipboard!\nPaste it in a new tab.\n\nAll other links will now open.');
    } catch (e) {
        prompt('⚠️ Copy this URL manually and paste in a new tab:', 'chrome://flags/');
    }

    // Open all links with slight delay to avoid popup blocker
    links.forEach((url, i) => {
        setTimeout(() => {
            window.open(url, '_blank');
        }, i * 300);
    });
};

// =========================================================
// ✈️ AIR FORCE SHOOTER GAME — Full Canvas Game Engine
// =========================================================
(function () {
    'use strict';

    const CW = 480, CH = 600;
    let canvas, ctx, animFrame;
    let gameRunning = false;
    let score, lives, currentLevel, kills, highScore;
    let player, bullets, enemies, particles, powerups, stars;
    let keysDown = {};
    let autoFireTimer = 0;

    // Audio Context
    let bgmAudioCtx = null;
    function playAirforceSound(type) {
        if (!bgmAudioCtx) {
            bgmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (bgmAudioCtx.state === 'suspended') bgmAudioCtx.resume();

        let osc = bgmAudioCtx.createOscillator();
        let gain = bgmAudioCtx.createGain();
        osc.connect(gain);
        gain.connect(bgmAudioCtx.destination);

        let now = bgmAudioCtx.currentTime;

        if (type === 'shoot') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'explosion') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'powerup') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.1);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 1.0);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
            osc.start(now);
            osc.stop(now + 1.0);
        }
    }
    let rapidFireEnd = 0;
    let shieldEnd = 0;
    let magnetEnd = 0;
    let enemySpawnTimer = 0;
    let waveEnemiesLeft = 0;
    let waveTransition = 0;
    let frameCount = 0;

    // Ranks
    const RANKS = [
        { score: 0, name: 'Cadet' },
        { score: 500, name: 'Lieutenant' },
        { score: 1500, name: 'Captain' },
        { score: 3000, name: 'Major' },
        { score: 5000, name: 'Colonel' },
        { score: 8000, name: 'General' },
        { score: 12000, name: 'Air Marshal' },
        { score: 20000, name: 'Supreme Commander' }
    ];

    function getRank(s) {
        let r = RANKS[0].name;
        for (let i = 0; i < RANKS.length; i++) {
            if (s >= RANKS[i].score) r = RANKS[i].name;
        }
        return r;
    }

    // Colors
    const COLORS = {
        player: '#06b6d4',
        playerGlow: 'rgba(6,182,212,0.3)',
        bullet: '#fbbf24',
        enemyBullet: '#ef4444',
        enemy1: '#ef4444',
        enemy2: '#f97316',
        enemy3: '#8b5cf6',
        boss: '#dc2626',
        kamikaze: '#f59e0b',
        shield: 'rgba(6,182,212,0.25)',
        explosion: ['#fbbf24', '#ef4444', '#f97316', '#fff', '#06b6d4']
    };

    // Init stars for scrolling background
    function initStars() {
        stars = [];
        for (let i = 0; i < 80; i++) {
            stars.push({
                x: Math.random() * CW,
                y: Math.random() * CH,
                s: Math.random() * 2 + 0.5,
                speed: Math.random() * 2 + 0.5
            });
        }
    }

    function updateStars() {
        for (let i = 0; i < stars.length; i++) {
            stars[i].y += stars[i].speed;
            if (stars[i].y > CH) {
                stars[i].y = 0;
                stars[i].x = Math.random() * CW;
            }
        }
    }

    function drawStars() {
        for (let i = 0; i < stars.length; i++) {
            let s = stars[i];
            ctx.fillStyle = `rgba(255,255,255,${0.3 + s.s * 0.2})`;
            ctx.fillRect(s.x, s.y, s.s, s.s);
        }
    }

    // Player
    function createPlayer() {
        return {
            x: CW / 2,
            y: CH - 70,
            w: 36,
            h: 40,
            speed: 5,
            invincible: 0
        };
    }

    function drawPlayer() {
        let p = player;
        let px = p.x, py = p.y;

        // Invincibility flash
        if (p.invincible > 0 && Math.floor(frameCount / 4) % 2 === 0) return;

        // Shield aura
        if (shieldEnd > Date.now()) {
            ctx.beginPath();
            ctx.arc(px, py - 5, 30, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.shield;
            ctx.fill();
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Engine glow
        ctx.beginPath();
        ctx.ellipse(px, py + 18, 6, 12 + Math.sin(frameCount * 0.3) * 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px, py + 15, 3, 6 + Math.sin(frameCount * 0.5) * 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Jet body
        ctx.beginPath();
        ctx.moveTo(px, py - 22);        // nose
        ctx.lineTo(px - 6, py - 8);     // left inner
        ctx.lineTo(px - 18, py + 14);   // left wing tip
        ctx.lineTo(px - 8, py + 10);    // left wing inner
        ctx.lineTo(px - 6, py + 18);    // left tail
        ctx.lineTo(px, py + 14);        // bottom center
        ctx.lineTo(px + 6, py + 18);    // right tail
        ctx.lineTo(px + 8, py + 10);    // right wing inner
        ctx.lineTo(px + 18, py + 14);   // right wing tip
        ctx.lineTo(px + 6, py - 8);     // right inner
        ctx.closePath();
        ctx.fillStyle = COLORS.player;
        ctx.fill();
        ctx.strokeStyle = '#0e7490';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cockpit
        ctx.beginPath();
        ctx.ellipse(px, py - 6, 4, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#164e63';
        ctx.fill();

        // Rapid fire indicator
        if (rapidFireEnd > Date.now()) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚡', px, py - 28);
        }
    }

    function updatePlayer() {
        let p = player;
        let sp = p.speed;
        if (keysDown['ArrowLeft'] || keysDown['a']) p.x -= sp;
        if (keysDown['ArrowRight'] || keysDown['d']) p.x += sp;
        if (keysDown['ArrowUp'] || keysDown['w']) p.y -= sp;
        if (keysDown['ArrowDown'] || keysDown['s']) p.y += sp;
        // Clamp
        p.x = Math.max(20, Math.min(CW - 20, p.x));
        p.y = Math.max(30, Math.min(CH - 30, p.y));
        if (p.invincible > 0) p.invincible--;
    }

    // Bullets
    function shoot() {
        let rapid = rapidFireEnd > Date.now();
        let bSpeed = -10;
        bullets.push({ x: player.x, y: player.y - 22, w: 3, h: 10, speed: bSpeed, type: 'player' });
        if (rapid) {
            bullets.push({ x: player.x - 10, y: player.y - 15, w: 3, h: 8, speed: bSpeed, type: 'player' });
            bullets.push({ x: player.x + 10, y: player.y - 15, w: 3, h: 8, speed: bSpeed, type: 'player' });
        }
        playAirforceSound('shoot');
    }

    function updateBullets() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.y += b.speed;
            if (b.y < -10 || b.y > CH + 10 || b.x < -10 || b.x > CW + 10) {
                bullets.splice(i, 1);
            }
        }
    }

    function drawBullets() {
        for (let i = 0; i < bullets.length; i++) {
            let b = bullets[i];
            if (b.type === 'player') {
                ctx.fillStyle = COLORS.bullet;
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 6;
                ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = COLORS.enemyBullet;
                ctx.beginPath();
                ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Enemies
    const LEVEL_SPEED_MULT = [0, 0.4, 0.7, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4]; // Level 1-10 speed multipliers
    const LEVEL_SPAWN_MULT = [0, 1.6, 1.3, 1.0, 0.85, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35]; // Level 1-10 spawn rate multipliers

    function spawnEnemy() {
        let types = ['fighter', 'bomber'];
        if (currentLevel >= 2) types.push('kamikaze');
        if (currentLevel >= 3) types.push('stealth');
        if (currentLevel >= 4) types.push('stealth', 'kamikaze');
        if (currentLevel >= 5 && Math.random() < (0.05 + currentLevel * 0.02)) types.push('boss');

        let type = types[Math.floor(Math.random() * types.length)];
        let mult = LEVEL_SPEED_MULT[currentLevel];
        let e = {
            x: Math.random() * (CW - 60) + 30,
            y: -40,
            type: type,
            hp: 1,
            speed: (1.5 + currentLevel * 0.2) * mult,
            shootTimer: 0,
            w: 28,
            h: 28,
            angle: 0
        };

        if (type === 'bomber') { e.hp = 3; e.speed = 1 * mult; e.w = 34; e.h = 34; }
        else if (type === 'stealth') { e.hp = 2; e.speed = 2.5 * mult; }
        else if (type === 'boss') { e.hp = 10 + currentLevel * 4; e.speed = 0.8 * mult; e.w = 50; e.h = 50; }
        else if (type === 'kamikaze') { e.hp = 1; e.speed = (3 + currentLevel * 0.3) * mult; }

        enemies.push(e);
    }

    function updateEnemies() {
        let now = Date.now();
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];

            if (e.type === 'kamikaze') {
                // Chase player
                let dx = player.x - e.x;
                let dy = player.y - e.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                e.x += (dx / dist) * e.speed;
                e.y += (dy / dist) * e.speed;
                e.angle = Math.atan2(dy, dx) + Math.PI / 2;
            } else if (e.type === 'stealth') {
                // Zigzag
                e.y += e.speed;
                e.x += Math.sin(frameCount * 0.05 + i) * 2;
            } else {
                e.y += e.speed;
                e.x += Math.sin(frameCount * 0.02 + i * 2) * 1;
            }

            // Enemy shooting (not kamikaze)
            if (e.type !== 'kamikaze' && e.y > 50 && e.y < CH - 100) {
                e.shootTimer++;
                let fireRate = e.type === 'boss' ? 30 : (e.type === 'bomber' ? 80 : 120);
                if (e.shootTimer >= fireRate) {
                    e.shootTimer = 0;
                    let dx2 = player.x - e.x;
                    let dy2 = player.y - e.y;
                    let d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                    bullets.push({
                        x: e.x, y: e.y + e.h / 2, w: 4, h: 4,
                        speed: 4,
                        vx: (dx2 / d2) * 4,
                        vy: (dy2 / d2) * 4,
                        type: 'enemy'
                    });
                    if (e.type === 'boss') {
                        // Boss shoots triple
                        bullets.push({ x: e.x - 15, y: e.y + e.h / 2, w: 4, h: 4, speed: 4, vx: 0, vy: 4, type: 'enemy' });
                        bullets.push({ x: e.x + 15, y: e.y + e.h / 2, w: 4, h: 4, speed: 4, vx: 0, vy: 4, type: 'enemy' });
                    }
                }
            }

            // Remove if off screen
            if (e.y > CH + 50 || e.x < -60 || e.x > CW + 60) {
                enemies.splice(i, 1);
            }
        }
    }

    function drawEnemy(e) {
        let ex = e.x, ey = e.y;
        ctx.save();
        if (e.type === 'kamikaze') {
            ctx.translate(ex, ey);
            ctx.rotate(e.angle || 0);
            ctx.translate(-ex, -ey);
        }
        if (e.type === 'fighter') {
            // Small red jet
            ctx.beginPath();
            ctx.moveTo(ex, ey + 16);
            ctx.lineTo(ex - 5, ey + 4);
            ctx.lineTo(ex - 14, ey - 10);
            ctx.lineTo(ex - 6, ey - 6);
            ctx.lineTo(ex, ey - 16);
            ctx.lineTo(ex + 6, ey - 6);
            ctx.lineTo(ex + 14, ey - 10);
            ctx.lineTo(ex + 5, ey + 4);
            ctx.closePath();
            ctx.fillStyle = COLORS.enemy1;
            ctx.fill();
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (e.type === 'bomber') {
            // Fat orange bomber
            ctx.beginPath();
            ctx.moveTo(ex, ey + 18);
            ctx.lineTo(ex - 10, ey + 6);
            ctx.lineTo(ex - 20, ey - 8);
            ctx.lineTo(ex - 8, ey - 4);
            ctx.lineTo(ex, ey - 18);
            ctx.lineTo(ex + 8, ey - 4);
            ctx.lineTo(ex + 20, ey - 8);
            ctx.lineTo(ex + 10, ey + 6);
            ctx.closePath();
            ctx.fillStyle = COLORS.enemy2;
            ctx.fill();
            ctx.strokeStyle = '#9a3412';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (e.type === 'stealth') {
            // Purple stealth - semi transparent
            ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.1) * 0.3;
            ctx.beginPath();
            ctx.moveTo(ex, ey + 14);
            ctx.lineTo(ex - 16, ey - 6);
            ctx.lineTo(ex, ey - 14);
            ctx.lineTo(ex + 16, ey - 6);
            ctx.closePath();
            ctx.fillStyle = COLORS.enemy3;
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (e.type === 'boss') {
            // Big red boss
            ctx.beginPath();
            ctx.moveTo(ex, ey + 28);
            ctx.lineTo(ex - 14, ey + 10);
            ctx.lineTo(ex - 28, ey - 5);
            ctx.lineTo(ex - 18, ey - 15);
            ctx.lineTo(ex, ey - 28);
            ctx.lineTo(ex + 18, ey - 15);
            ctx.lineTo(ex + 28, ey - 5);
            ctx.lineTo(ex + 14, ey + 10);
            ctx.closePath();
            ctx.fillStyle = COLORS.boss;
            ctx.fill();
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 2;
            ctx.stroke();
            // HP bar
            let hpW = 40;
            let maxHp = 10 + wave * 2;
            ctx.fillStyle = '#374151';
            ctx.fillRect(ex - hpW / 2, ey - 35, hpW, 4);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(ex - hpW / 2, ey - 35, hpW * (e.hp / maxHp), 4);
        } else if (e.type === 'kamikaze') {
            // Yellow triangle
            ctx.beginPath();
            ctx.moveTo(ex, ey - 14);
            ctx.lineTo(ex - 10, ey + 12);
            ctx.lineTo(ex + 10, ey + 12);
            ctx.closePath();
            ctx.fillStyle = COLORS.kamikaze;
            ctx.fill();
            // Engine trail
            ctx.beginPath();
            ctx.arc(ex, ey + 16, 4 + Math.sin(frameCount * 0.4) * 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
        }
        ctx.restore();
    }

    function drawEnemies() {
        for (let i = 0; i < enemies.length; i++) {
            drawEnemy(enemies[i]);
        }
    }

    // Particles
    function spawnExplosion(x, y, count, colors) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 25 + Math.random() * 20,
                maxLife: 45,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function drawParticles() {
        for (let i = 0; i < particles.length; i++) {
            let p = particles[i];
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Power-ups
    function spawnPowerup(x, y) {
        let types = ['shield', 'rapid', 'bomb', 'magnet', 'life'];
        let t = types[Math.floor(Math.random() * types.length)];
        let emojis = { shield: '🛡️', rapid: '⚡', bomb: '💣', magnet: '🧲', life: '❤️' };
        powerups.push({
            x: x, y: y, type: t,
            emoji: emojis[t],
            speed: 1.5, size: 16,
            glow: 0
        });
    }

    function updatePowerups() {
        for (let i = powerups.length - 1; i >= 0; i--) {
            let pu = powerups[i];
            pu.y += pu.speed;
            pu.glow += 0.1;

            // Magnet effect
            if (magnetEnd > Date.now()) {
                let dx = player.x - pu.x;
                let dy = player.y - pu.y;
                let d = Math.sqrt(dx * dx + dy * dy) || 1;
                if (d < 200) {
                    pu.x += (dx / d) * 3;
                    pu.y += (dy / d) * 3;
                }
            }

            // Collect
            let dx = player.x - pu.x;
            let dy = player.y - pu.y;
            if (Math.sqrt(dx * dx + dy * dy) < 25) {
                collectPowerup(pu);
                powerups.splice(i, 1);
                continue;
            }

            if (pu.y > CH + 20) powerups.splice(i, 1);
        }
    }

    function collectPowerup(pu) {
        let now = Date.now();
        if (pu.type === 'shield') {
            shieldEnd = now + 8000;
        } else if (pu.type === 'rapid') {
            rapidFireEnd = now + 6000;
        } else if (pu.type === 'bomb') {
            // Kill all enemies on screen
            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                spawnExplosion(e.x, e.y, 10, COLORS.explosion);
                score += e.type === 'boss' ? 50 : 10;
                kills++;
            }
            enemies = [];
            // Big explosion flash
            spawnExplosion(CW / 2, CH / 2, 30, ['#fff', '#fbbf24']);
            playAirforceSound('explosion');
        } else if (pu.type === 'magnet') {
            magnetEnd = now + 10000;
        } else if (pu.type === 'life') {
            lives = Math.min(lives + 1, 5);
        }
        spawnExplosion(pu.x, pu.y, 8, ['#fff', '#fbbf24', '#06b6d4']);
        playAirforceSound('powerup');
    }

    function drawPowerups() {
        for (let i = 0; i < powerups.length; i++) {
            let pu = powerups[i];
            // Glow circle
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, pu.size + 4 + Math.sin(pu.glow) * 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(251,191,36,0.15)';
            ctx.fill();
            // BG circle
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, pu.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fill();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Emoji
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pu.emoji, pu.x, pu.y);
        }
    }

    // Collisions
    function checkCollisions() {
        // Player bullets vs enemies
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
            let b = bullets[bi];
            if (b.type !== 'player') continue;
            for (let ei = enemies.length - 1; ei >= 0; ei--) {
                let e = enemies[ei];
                let dx = b.x - e.x;
                let dy = b.y - e.y;
                if (Math.abs(dx) < e.w / 2 + 4 && Math.abs(dy) < e.h / 2 + 6) {
                    e.hp--;
                    bullets.splice(bi, 1);
                    if (e.hp <= 0) {
                        let pts = e.type === 'boss' ? 100 : (e.type === 'bomber' ? 30 : (e.type === 'stealth' ? 25 : 10));
                        score += pts;
                        kills++;
                        waveEnemiesLeft--;
                        spawnExplosion(e.x, e.y, e.type === 'boss' ? 30 : 12, COLORS.explosion);
                        playAirforceSound('explosion');
                        // Drop powerup chance
                        if (Math.random() < (e.type === 'boss' ? 1 : 0.15)) {
                            spawnPowerup(e.x, e.y);
                        }
                        enemies.splice(ei, 1);
                    } else {
                        spawnExplosion(b.x, b.y, 3, ['#fff']);
                    }
                    break;
                }
            }
        }

        // Enemy bullets vs player
        if (player.invincible <= 0) {
            for (let bi = bullets.length - 1; bi >= 0; bi--) {
                let b = bullets[bi];
                if (b.type !== 'enemy') continue;
                // Update enemy bullet position with vx/vy
                if (b.vx !== undefined) {
                    b.x += b.vx;
                    b.y += b.vy;
                    b.speed = 0; // already moved by vx/vy
                }
                let dx = b.x - player.x;
                let dy = b.y - player.y;
                if (Math.abs(dx) < 14 && Math.abs(dy) < 18) {
                    bullets.splice(bi, 1);
                    if (shieldEnd > Date.now()) {
                        shieldEnd = 0; // shield absorbs hit
                        spawnExplosion(player.x, player.y, 8, ['#06b6d4', '#fff']);
                        playAirforceSound('explosion');
                    } else {
                        playerHit();
                    }
                    break;
                }
            }
        }

        // Enemies vs player (collision)
        if (player.invincible <= 0) {
            for (let ei = enemies.length - 1; ei >= 0; ei--) {
                let e = enemies[ei];
                let dx = e.x - player.x;
                let dy = e.y - player.y;
                if (Math.abs(dx) < (e.w / 2 + 14) && Math.abs(dy) < (e.h / 2 + 18)) {
                    if (shieldEnd > Date.now()) {
                        shieldEnd = 0;
                        spawnExplosion(e.x, e.y, 15, COLORS.explosion);
                        playAirforceSound('explosion');
                        enemies.splice(ei, 1);
                        kills++;
                        score += 5;
                    } else {
                        spawnExplosion(e.x, e.y, 12, COLORS.explosion);
                        playAirforceSound('explosion');
                        enemies.splice(ei, 1);
                        playerHit();
                    }
                    break;
                }
            }
        }
    }

    function playerHit() {
        lives--;
        player.invincible = 90; // ~1.5 sec
        spawnExplosion(player.x, player.y, 15, ['#ef4444', '#fff', '#fbbf24']);
        playAirforceSound('explosion');
        if (lives <= 0) {
            gameOver();
        }
    }

    // Level system
    function startLevel(n) {
        currentLevel = Math.min(n, 10);
        if (n > 10) currentLevel = 10; // Stay at max level
        waveEnemiesLeft = 10 + currentLevel * 5;
        if (currentLevel === 10) waveEnemiesLeft += 20; // Extra enemies on final level
        enemySpawnTimer = 0;
        waveTransition = 120; // 2 sec transition
    }

    function updateLevelSystem() {
        if (waveTransition > 0) {
            waveTransition--;
            return;
        }
        if (waveEnemiesLeft > 0 || enemies.length > 0) {
            enemySpawnTimer++;
            let baseSpawnRate = Math.max(20, 60 - currentLevel * 5);
            let spawnRate = baseSpawnRate * LEVEL_SPAWN_MULT[currentLevel];
            if (enemySpawnTimer >= spawnRate && waveEnemiesLeft > 0) {
                enemySpawnTimer = 0;
                spawnEnemy();
                waveEnemiesLeft--;
            }
        } else {
            // Level cleared
            if (currentLevel < 10) {
                startLevel(currentLevel + 1);
            } else {
                startLevel(11); // Continue at maximum difficulty
            }
        }
    }

    // HUD
    function drawHUD() {
        // Level transition text
        if (waveTransition > 0) {
            ctx.fillStyle = `rgba(6,182,212,${waveTransition / 120})`;
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL ' + currentLevel, CW / 2, CH / 2 - 10);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = `rgba(255,255,255,${waveTransition / 120})`;
            if (currentLevel === 10) {
                ctx.fillStyle = `rgba(220,38,38,${waveTransition / 120})`;
                ctx.fillText('FINAL MISSION!', CW / 2, CH / 2 + 20);
            } else {
                ctx.fillText('Get Ready!', CW / 2, CH / 2 + 20);
            }
        }

        // Top HUD bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CW, 28);
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#06b6d4';
        ctx.fillText('Score: ' + score, 8, 18);
        ctx.fillStyle = '#ef4444';
        let hearts = '';
        for (let i = 0; i < lives; i++) hearts += '❤️';
        ctx.fillText(hearts, CW / 2 - 30, 19);
        ctx.fillStyle = '#f97316';
        ctx.textAlign = 'right';
        ctx.fillText('LVL ' + currentLevel, CW - 8, 18);
    }

    // Update sidebar HUD
    function updateSidebarHUD() {
        let scoreEl = document.getElementById('airforceScore');
        let livesEl = document.getElementById('airforceLives');
        let levelEl = document.getElementById('airforceLevel');
        let rankEl = document.getElementById('airforceRank');
        if (scoreEl) scoreEl.textContent = score;
        if (livesEl) livesEl.textContent = lives;
        if (levelEl) levelEl.textContent = currentLevel;
        if (rankEl) rankEl.textContent = getRank(score);
    }

    // Game Over
    function gameOver() {
        gameRunning = false;
        playAirforceSound('gameover');
        if (animFrame) cancelAnimationFrame(animFrame);

        // Save high score
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('airforceHighScore', highScore);
        }
        let hsEl = document.getElementById('airforceHighScore');
        if (hsEl) hsEl.textContent = highScore;

        // Show game over overlay
        document.getElementById('airforceGameOverOverlay').classList.remove('hidden');
        document.getElementById('airforceFinalScore').textContent = score;
        document.getElementById('airforceFinalLevel').textContent = currentLevel;
        document.getElementById('airforceFinalKills').textContent = kills;

        // Save to Firebase leaderboard
        try {
            const user = JSON.parse(localStorage.getItem('loggedInUser'));
            if (user && user.name && typeof window.saveLeaderboardScore === 'function') {
                window.saveLeaderboardScore('airforce', user.name, score);
            }
        } catch (e) { }

        updateSidebarHUD();
    }

    // Main game loop
    function gameLoop() {
        if (!gameRunning) return;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, CW, CH);

        updateStars();
        drawStars();

        updatePlayer();
        drawPlayer();

        // Auto-fire
        autoFireTimer++;
        let fireRate = rapidFireEnd > Date.now() ? 5 : 12;
        if (autoFireTimer >= fireRate) {
            autoFireTimer = 0;
            shoot();
        }

        updateBullets();
        drawBullets();

        updateLevelSystem();
        updateEnemies();
        drawEnemies();

        updatePowerups();
        drawPowerups();

        checkCollisions();

        updateParticles();
        drawParticles();

        drawHUD();

        frameCount++;
        if (frameCount % 15 === 0) updateSidebarHUD();

        animFrame = requestAnimationFrame(gameLoop);
    }

    // Start game
    window.startAirforceGame = function () {
        canvas = document.getElementById('airforceCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        // Hide overlays
        document.getElementById('airforceGameOverOverlay').classList.add('hidden');
        document.getElementById('airforceStartScreen').classList.add('hidden');

        score = 0;
        lives = 3;
        currentLevel = 1;
        kills = 0;
        frameCount = 0;
        autoFireTimer = 0;
        rapidFireEnd = 0;
        shieldEnd = 0;
        magnetEnd = 0;

        player = createPlayer();
        bullets = [];
        enemies = [];
        particles = [];
        powerups = [];
        keysDown = {};

        highScore = parseInt(localStorage.getItem('airforceHighScore')) || 0;
        let hsEl = document.getElementById('airforceHighScore');
        if (hsEl) hsEl.textContent = highScore;

        initStars();
        startLevel(1);

        if (animFrame) cancelAnimationFrame(animFrame);
        gameRunning = true;
        gameLoop();
    };

    // Keyboard handlers
    function onKeyDown(e) {
        if (!gameRunning) return;
        let overlay = document.getElementById('airforceGameOverlay');
        if (!overlay || !overlay.classList.contains('active')) return;

        let k = e.key;
        keysDown[k] = true;

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) {
            e.preventDefault();
        }
    }

    function onKeyUp(e) {
        keysDown[e.key] = false;
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Mouse controls
    document.addEventListener('mousemove', function (e) {
        if (!gameRunning) return;
        let overlay = document.getElementById('airforceGameOverlay');
        if (!overlay || !overlay.classList.contains('active')) return;

        let canvasEl = document.getElementById('airforceCanvas');
        if (!canvasEl) return;
        let rect = canvasEl.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {

            let scaleX = canvasEl.width / rect.width;
            let scaleY = canvasEl.height / rect.height;
            let mx = (e.clientX - rect.left) * scaleX;
            let my = (e.clientY - rect.top) * scaleY;

            player.x = Math.max(20, Math.min(CW - 20, mx));
            player.y = Math.max(30, Math.min(CH - 30, my));
        }
    });

    // Touch controls for mobile
    let touchStartX = 0, touchStartY = 0;
    document.addEventListener('touchstart', function (e) {
        if (!gameRunning) return;
        let overlay = document.getElementById('airforceGameOverlay');
        if (!overlay || !overlay.classList.contains('active')) return;
        let t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (!gameRunning) return;
        let overlay = document.getElementById('airforceGameOverlay');
        if (!overlay || !overlay.classList.contains('active')) return;
        let t = e.touches[0];
        let dx = t.clientX - touchStartX;
        let dy = t.clientY - touchStartY;
        player.x += dx * 0.5;
        player.y += dy * 0.5;
        player.x = Math.max(20, Math.min(CW - 20, player.x));
        player.y = Math.max(30, Math.min(CH - 30, player.y));
        touchStartX = t.clientX;
        touchStartY = t.clientY;
    }, { passive: true });

    // Cleanup on close
    const origBackToHub = window.backToHub;
    window.backToHub = function (overlayId) {
        if (overlayId === 'airforceGameOverlay') {
            gameRunning = false;
            if (animFrame) cancelAnimationFrame(animFrame);
            keysDown = {};
        }
        if (origBackToHub) origBackToHub(overlayId);
    };
})();

// #region 🔒 SONGS HUB - Premium Rotating Music Channels
(function () {
    // ──── Channel Data ────
    const songsChannels = [
        {
            name: 'Bollywood Hits',
            emoji: '🎬',
            genre: 'Hindi Pop',
            bg: 'linear-gradient(135deg, #f97316, #ea580c)',
            streams: [
                'https://stream-14.zeno.fm/r2gn1pgm4qruv',
                'https://server4.ujala.nl/stream/2/listen.mp3',
                'https://bollyvibes.radioca.st/stream'
            ]
        },
        {
            name: 'English Pop Hits',
            emoji: '🌟',
            genre: 'English Pop',
            bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            streams: [
                'https://kathy.torontocast.com:3060/stream'
            ]
        },
        {
            name: 'Lo-Fi Chill',
            emoji: '🌙',
            genre: 'Lo-Fi Beats',
            bg: 'linear-gradient(135deg, #6366f1, #4338ca)',
            streams: [
                'https://stream.zeno.fm/f3wvbbqmdg8uv'
            ]
        },
        {
            name: 'Retro Classics',
            emoji: '📻',
            genre: 'Old Hindi Gold',
            bg: 'linear-gradient(135deg, #d97706, #b45309)',
            streams: [
                'https://stream.zeno.fm/u0hrd3xkzhhvv',
                'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio005/hlspbaudio005_Auto.m3u8',
                'https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8'
            ]
        },
        {
            name: 'Romantic Melodies',
            emoji: '💕',
            genre: 'Love Songs (Hindi)',
            bg: 'linear-gradient(135deg, #ec4899, #be185d)',
            streams: [
                'https://drive.uber.radio/uber/bollywoodlove/icecast.audio',
                'https://cp3.shoutcheap.com:18180/stream',
                'https://stream.zeno.fm/cqak4ap7by8uv'
            ]
        },
        {
            name: 'Bolly Top 100',
            emoji: 'ðŸ”¥',
            genre: 'Latest Hindi Hits',
            bg: 'linear-gradient(135deg, #ef4444, #db2777)',
            streams: [
                'https://stream.zeno.fm/1x7m4f2a5ehvv',
                'https://stream.zeno.fm/cqak4ap7by8uv'
            ]
        },
        {
            name: 'Top 40 Global',
            emoji: 'ðŸŒ',
            genre: 'English Top 40',
            bg: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
            streams: [
                'http://strm112.1.fm/top40_mobile_mp3',
                'https://kathy.torontocast.com:3060/stream'
            ]
        },
        {
            name: 'Golden Oldies',
            emoji: 'ðŸ“€',
            genre: 'English Classics',
            bg: 'linear-gradient(135deg, #14b8a6, #0f766e)',
            streams: [
                'http://bigrradio.cdnstream1.com/5198_128',
                'https://kathy.torontocast.com:3060/stream'
            ]
        }
    ];

    let currentAngle = 0;
    let currentPlaying = -1;
    let currentStreamIndex = 0;
    let autoRotateTimer = null;
    let songsAudioEventsBound = false;
    const totalCards = songsChannels.length;
    const songsHubTabId = `songs-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const songsHubStateKey = 'cvangSongsHubState';
    const songsHubCommandKey = 'cvangSongsHubCommand';
    let songsVolume = 0.8;
    let previousSongsVolume = 0.8;

    function getSongStreams(channel) {
        if (!channel) return [];
        if (Array.isArray(channel.streams) && channel.streams.length) return channel.streams;
        return channel.stream ? [channel.stream] : [];
    }

    function updateSongsNowPlaying(message) {
        const nowText = document.getElementById('songsNowText');
        if (nowText) nowText.textContent = message;
    }

    function setMiniPlayer(trackText, forceShow = false) {
        const miniPlayer = document.getElementById('songsMiniPlayer');
        const miniText = document.getElementById('miniPlayerText');
        if (miniText && trackText) miniText.textContent = trackText;
        if (miniPlayer && forceShow) miniPlayer.style.display = 'flex';
    }

    function updateVolumeIcons(volumeValue) {
        const volume = Number(volumeValue);
        const icon = volume <= 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
        const songsVolumeIcon = document.getElementById('songsVolumeIcon');
        const miniPlayerVolumeIcon = document.getElementById('miniPlayerVolumeIcon');
        if (songsVolumeIcon) songsVolumeIcon.textContent = icon;
        if (miniPlayerVolumeIcon) miniPlayerVolumeIcon.textContent = icon;
    }

    function syncVolumeControls() {
        const slider = document.getElementById('songsVolumeSlider');
        if (slider) slider.value = String(Math.round(songsVolume * 100));
        updateVolumeIcons(songsVolume);
    }

    function ensureMiniPlayerVolumeButton() {
        const miniPlayer = document.getElementById('songsMiniPlayer');
        if (!miniPlayer || document.getElementById('miniPlayerVolumeIcon')) return;

        const stopButton = miniPlayer.querySelector('.mini-player-stop');
        const volumeButton = document.createElement('button');
        volumeButton.className = 'mini-player-volume';
        volumeButton.id = 'miniPlayerVolumeIcon';
        volumeButton.type = 'button';
        volumeButton.textContent = '🔊';
        volumeButton.addEventListener('click', function (event) {
            event.stopPropagation();
            window.toggleSongsMute();
        });

        if (stopButton) {
            miniPlayer.insertBefore(volumeButton, stopButton);
        } else {
            miniPlayer.appendChild(volumeButton);
        }
    }

    function applySongsVolume() {
        const audio = document.getElementById('songsAudioPlayer');
        if (audio) audio.volume = songsVolume;
        syncVolumeControls();
    }

    function broadcastSongsHubState(payload) {
        try {
            localStorage.setItem(
                songsHubStateKey,
                JSON.stringify({
                    ...payload,
                    updatedAt: Date.now()
                })
            );
        } catch (error) {
            console.warn('Songs Hub state sync failed:', error);
        }
    }

    function syncSongsHubState() {
        const overlay = document.getElementById('songsHubOverlay');
        const isMinimized = !!(overlay && !overlay.classList.contains('active') && currentPlaying !== -1);
        const channel = currentPlaying !== -1 ? songsChannels[currentPlaying] : null;

        broadcastSongsHubState({
            ownerId: songsHubTabId,
            playing: currentPlaying !== -1,
            minimized: isMinimized,
            channelIndex: currentPlaying,
            text: channel ? `${channel.name} Playing...` : '',
            label: channel ? `${channel.emoji} ${channel.name} - ${channel.genre}` : 'Select a channel to play'
        });
    }

    function showSyncedMiniPlayer(text) {
        const overlay = document.getElementById('songsHubOverlay');
        if (overlay && overlay.classList.contains('active')) return;
        setMiniPlayer(text || 'Song Playing...', true);
    }

    function hideMiniPlayerIfIdle() {
        const miniPlayer = document.getElementById('songsMiniPlayer');
        if (miniPlayer && currentPlaying === -1) miniPlayer.style.display = 'none';
    }

    function sendSongsHubCommand(type) {
        try {
            localStorage.setItem(
                songsHubCommandKey,
                JSON.stringify({
                    type,
                    sourceId: songsHubTabId,
                    updatedAt: Date.now()
                })
            );
        } catch (error) {
            console.warn('Songs Hub command sync failed:', error);
        }
    }

    function bindSongsAudioEvents() {
        if (songsAudioEventsBound) return;

        const audio = document.getElementById('songsAudioPlayer');
        if (!audio) return;

        audio.volume = songsVolume;
        audio.addEventListener('error', tryNextSongsStream);
        audio.addEventListener('stalled', tryNextSongsStream);
        songsAudioEventsBound = true;
    }

    function tryNextSongsStream() {
        if (currentPlaying === -1) return;

        const audio = document.getElementById('songsAudioPlayer');
        const channel = songsChannels[currentPlaying];
        const streams = getSongStreams(channel);
        if (!audio || !channel || streams.length === 0) return;

        if (currentStreamIndex < streams.length - 1) {
            currentStreamIndex += 1;
            updateSongsNowPlaying(`${channel.emoji} ${channel.name} - trying backup stream...`);
            setMiniPlayer(`${channel.name} - trying backup...`);
            audio.src = streams[currentStreamIndex];
            audio.load();
            audio.play().catch(err => console.warn('Backup audio play failed:', err));
            return;
        }

        updateSongsNowPlaying(`${channel.emoji} ${channel.name} is unavailable right now`);
        setMiniPlayer(`${channel.name} unavailable`, true);
        console.warn(`All streams failed for ${channel.name}`);
    }

    // ──── Build Carousel ────
    function buildSongsCarousel() {
        const carousel = document.getElementById('songsCarousel');
        if (!carousel) return;
        bindSongsAudioEvents();
        carousel.innerHTML = '';

        songsChannels.forEach((ch, i) => {
            const card = document.createElement('div');
            card.className = 'songs-channel-card';
            card.style.background = ch.bg;
            card.innerHTML = `
                <span class="card-emoji">${ch.emoji}</span>
                <span class="card-name">${ch.name}</span>
                <span class="card-genre">${ch.genre}</span>
            `;
            card.addEventListener('click', () => playSongsChannel(i));
            carousel.appendChild(card);
        });

        positionCards();
    }

    function positionCards() {
        const carousel = document.getElementById('songsCarousel');
        if (!carousel) return;
        const cards = carousel.querySelectorAll('.songs-channel-card');

        cards.forEach((card, i) => {
            card.style.transform = 'none';
            card.style.opacity = '1';
            card.style.zIndex = String(10 + i);
            card.style.pointerEvents = 'auto';
        });
    }

    // ──── Rotate ────
    window.rotateSongsCarousel = function () {
        positionCards();
    };

    function autoRotate() {
        positionCards();
    }

    window.setSongsVolume = function (value) {
        const parsedVolume = Math.min(100, Math.max(0, Number(value))) / 100;
        songsVolume = parsedVolume;
        if (songsVolume > 0) previousSongsVolume = songsVolume;
        applySongsVolume();
    };

    window.toggleSongsMute = function () {
        if (songsVolume <= 0) {
            songsVolume = previousSongsVolume > 0 ? previousSongsVolume : 0.8;
        } else {
            previousSongsVolume = songsVolume;
            songsVolume = 0;
        }
        applySongsVolume();
    };

    function startAutoRotate() {
        stopAutoRotate();
        autoRotateTimer = setInterval(autoRotate, 4000);
    }

    function stopAutoRotate() {
        if (autoRotateTimer) {
            clearInterval(autoRotateTimer);
            autoRotateTimer = null;
        }
    }

    function restartAutoRotate() {
        stopAutoRotate();
        autoRotateTimer = setInterval(autoRotate, 4000);
    }

    // ──── Play Channel ────
    function playSongsChannel(index) {
        const audio = document.getElementById('songsAudioPlayer');
        const eq = document.getElementById('songsEQ');
        const nowText = document.getElementById('songsNowText');
        const stopBtn = document.getElementById('songsStopBtn');
        const carousel = document.getElementById('songsCarousel');

        if (!audio || !eq || !nowText || !stopBtn || !carousel) return;

        // Stop current
        audio.pause();
        audio.src = '';

        // Remove all playing states
        carousel.querySelectorAll('.songs-channel-card').forEach(c => c.classList.remove('playing'));

        if (currentPlaying === index) {
            // Toggle off
            window.stopSongsChannel();
            return;
        }

        // Play new
        currentPlaying = index;
        currentStreamIndex = 0;
        const ch = songsChannels[index];
        const streams = getSongStreams(ch);
        if (!streams.length) {
            updateSongsNowPlaying(`${ch.emoji} ${ch.name} has no stream configured`);
            return;
        }

        audio.src = streams[currentStreamIndex];
        audio.load();
        audio.play().catch(err => console.warn('Audio play failed:', err));

        // Update UI
        const cards = carousel.querySelectorAll('.songs-channel-card');
        if (cards[index]) cards[index].classList.add('playing');
        eq.classList.add('active');
        nowText.textContent = `${ch.emoji} ${ch.name} — ${ch.genre}`;
        stopBtn.style.display = 'inline-block';

        setMiniPlayer(`${ch.name} Playing...`);
        syncSongsHubState();
    }

    // ──── Stop ────
    window.stopSongsChannel = function (shouldBroadcast = true) {
        const audio = document.getElementById('songsAudioPlayer');
        const eq = document.getElementById('songsEQ');
        const nowText = document.getElementById('songsNowText');
        const stopBtn = document.getElementById('songsStopBtn');
        const carousel = document.getElementById('songsCarousel');
        const miniPlayer = document.getElementById('songsMiniPlayer');

        if (audio) { audio.pause(); audio.src = ''; }
        if (eq) eq.classList.remove('active');
        if (nowText) nowText.textContent = 'Select a channel to play';
        if (stopBtn) stopBtn.style.display = 'none';
        if (carousel) carousel.querySelectorAll('.songs-channel-card').forEach(c => c.classList.remove('playing'));
        if (miniPlayer) miniPlayer.style.display = 'none';
        currentPlaying = -1;
        currentStreamIndex = 0;

        broadcastSongsHubState({
            ownerId: songsHubTabId,
            playing: false,
            minimized: false,
            channelIndex: -1,
            text: '',
            label: 'Select a channel to play'
        });

        if (shouldBroadcast) {
            sendSongsHubCommand('stop');
        }
    };

    // ──── Minimize & Maximize ────
    window.minimizeSongsHub = function () {
        if (currentPlaying === -1) {
            alert("Play a song first before minimizing!");
            return;
        }
        const overlay = document.getElementById('songsHubOverlay');
        const miniPlayer = document.getElementById('songsMiniPlayer');
        if (overlay) overlay.classList.remove('active');
        if (miniPlayer) miniPlayer.style.display = 'flex';
        syncSongsHubState();
        stopAutoRotate();
    };

    window.maximizeSongsHub = function () {
        const overlay = document.getElementById('songsHubOverlay');
        const miniPlayer = document.getElementById('songsMiniPlayer');
        if (overlay) overlay.classList.add('active');
        if (miniPlayer) miniPlayer.style.display = 'none';
        syncSongsHubState();
        startAutoRotate();
    };

    // ──── Open / Close with Password ────
    window.openSongsHub = function () {
        var password = prompt('🔒 Enter Password to open Songs Hub:');
        if (password !== 'shiv') {
            if (password !== null) alert('❌ Wrong Password!');
            return;
        }

        const overlay = document.getElementById('songsHubOverlay');
        const miniPlayer = document.getElementById('songsMiniPlayer');
        if (miniPlayer && miniPlayer.style.display === 'flex') {
            window.maximizeSongsHub();
            return;
        }

        if (!overlay) return;
        overlay.classList.add('active');
        buildSongsCarousel();
        startAutoRotate();
    };

    window.closeSongsHub = function () {
        const overlay = document.getElementById('songsHubOverlay');
        if (overlay) overlay.classList.remove('active');
        stopAutoRotate();
        window.stopSongsChannel();
    };

    // Close on outside click
    document.addEventListener('click', function (e) {
        const overlay = document.getElementById('songsHubOverlay');
        if (e.target === overlay) {
            window.closeSongsHub();
        }
    });

    // ──── Draggable Mini Player Logic ────
    window.addEventListener('storage', function (event) {
        if (event.key === songsHubStateKey && event.newValue) {
            try {
                const state = JSON.parse(event.newValue);
                if (!state || state.ownerId === songsHubTabId) return;

                updateSongsNowPlaying(state.label || 'Song Playing in another tab');
                setMiniPlayer(state.text || 'Song Playing...');

                if (state.playing && state.minimized) {
                    showSyncedMiniPlayer(state.text || 'Song Playing...');
                } else if (!state.playing) {
                    hideMiniPlayerIfIdle();
                }
            } catch (error) {
                console.warn('Songs Hub state parse failed:', error);
            }
        }

        if (event.key === songsHubCommandKey && event.newValue) {
            try {
                const command = JSON.parse(event.newValue);
                if (!command || command.sourceId === songsHubTabId) return;

                if (command.type === 'stop' && currentPlaying !== -1) {
                    window.stopSongsChannel(false);
                }
            } catch (error) {
                console.warn('Songs Hub command parse failed:', error);
            }
        }
    });

    try {
        const initialSongsState = localStorage.getItem(songsHubStateKey);
        if (initialSongsState) {
            const state = JSON.parse(initialSongsState);
            if (state && state.playing && state.ownerId !== songsHubTabId) {
                updateSongsNowPlaying(state.label || 'Song Playing in another tab');
                showSyncedMiniPlayer(state.text || 'Song Playing...');
            }
        }
    } catch (error) {
        console.warn('Songs Hub initial sync failed:', error);
    }

    const miniPlayer = document.getElementById('songsMiniPlayer');
    ensureMiniPlayerVolumeButton();
    applySongsVolume();
    if (miniPlayer) {
        let isDragging = false;
        let pX = 0, pY = 0, startX = 0, startY = 0;
        let isClick = true;

        miniPlayer.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        miniPlayer.addEventListener('touchstart', dragStart, { passive: true });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);

        // Prevent maximize if just dragging
        const miniInfo = miniPlayer.querySelector('.mini-player-info');
        if (miniInfo) {
            miniInfo.addEventListener('click', function (e) {
                if (!isClick) {
                    e.stopPropagation();
                    return;
                }
                // Only maximize if it was a click
                window.maximizeSongsHub();
            });
            // remove inline onclick as we handle it here
            miniInfo.removeAttribute('onclick');
        }

        function dragStart(e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

            // Allow pointer-events
            isDragging = true;
            isClick = true; // resets to click until proven otherwise
            miniPlayer.style.transition = 'none';

            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            const rect = miniPlayer.getBoundingClientRect();
            pX = startX - rect.left;
            pY = startY - rect.top;
        }

        function drag(e) {
            if (!isDragging) return;

            let clientX, clientY;
            if (e.type === 'touchmove') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            // Distinguish drag from a simple click
            if (Math.abs(clientX - startX) > 5 || Math.abs(clientY - startY) > 5) {
                isClick = false;
            }

            if (!isClick) {
                // Remove right/bottom anchoring to use precise left/top calculations
                miniPlayer.style.bottom = 'auto';
                miniPlayer.style.right = 'auto';

                // Boundaries
                let newX = clientX - pX;
                let newY = clientY - pY;
                let maxX = window.innerWidth - miniPlayer.offsetWidth;
                let maxY = window.innerHeight - miniPlayer.offsetHeight;

                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(0, Math.min(newY, maxY));

                miniPlayer.style.left = newX + 'px';
                miniPlayer.style.top = newY + 'px';
            }
        }

        function dragEnd() {
            if (!isDragging) return;
            isDragging = false;
            miniPlayer.style.transition = 'all 0.3s ease';
            // isClick state resets on next dragStart
        }
    }
})();
// #endregion
