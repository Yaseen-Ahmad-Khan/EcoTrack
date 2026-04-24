import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---- Scene Setup ---- //
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 7); // Positioned back to view the whole globe

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High DPI display support

// Adjust aesthetics for realistic rendering
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

document.getElementById('canvas-container').appendChild(renderer.domElement);

// ---- Lighting ---- //
// Soft global light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Primary "sun" light
const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// Accented back light for the "Eco" theme
const backLight = new THREE.DirectionalLight(0x00ff88, 1.2);
backLight.position.set(-5, -3, -5);
scene.add(backLight);

// ---- 3D Model Group ---- //
// We wrap the earth in a group. The earth spins infinitely inside the group, 
// while the group tilts responsibly to mouse movements.
const earthGroup = new THREE.Group();
scene.add(earthGroup);

let earthModel;
const loader = new GLTFLoader();

// Keep the globe perfectly centered on all devices
earthGroup.position.x = 0; 
earthGroup.position.y = 0;

// ---- Loading the Model ---- //
loader.load(
    '../Assets/earth.glb', 
    (gltf) => {
        earthModel = gltf.scene;
        
        // Auto-scale the model to fit nicely regardless of its original dimensions
        const box = new THREE.Box3().setFromObject(earthModel);
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());
        
        // Center the geometry internally
        earthModel.position.x += (earthModel.position.x - center.x);
        earthModel.position.y += (earthModel.position.y - center.y);
        earthModel.position.z += (earthModel.position.z - center.z);
        
        // Make the earth HUGE to fill the screen
        const scale = 10.0 / size;
        earthModel.scale.setScalar(scale);

        earthGroup.add(earthModel);

        // Hide the loading text smoothly
        const loadingElement = document.getElementById('loading');
        if(loadingElement) {
            loadingElement.style.transition = "opacity 0.5s ease";
            loadingElement.style.opacity = "0";
            setTimeout(() => { loadingElement.style.display = 'none'; }, 500);
        }
    }, 
    (xhr) => {
        // Handle loading progress
        const loadingElement = document.getElementById('loading');
        if (loadingElement && xhr.total > 0) {
            const percent = (xhr.loaded / xhr.total * 100);
            loadingElement.innerText = `Connecting to Satellite Data... ${Math.round(percent)}%`;
        }
    }, 
    (error) => {
        console.error("Error loading the 3D model: ", error);
        const loadingElement = document.getElementById('loading');
        if(loadingElement) loadingElement.innerText = `Connection Failed. Error loading data.`;
    }
);

// ---- Interaction Setup ---- //
let mouseX = 0;
let mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// Mouse tracking
document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

// Touch tracking
document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
        mouseX = (event.touches[0].clientX - windowHalfX);
        mouseY = (event.touches[0].clientY - windowHalfY);
    }
}, { passive: true });

// Drag capability (optional extra touch)
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

document.addEventListener('mousedown', (e) => { isDragging = true; });
document.addEventListener('mouseup', (e) => { isDragging = false; });

document.addEventListener('mousemove', (e) => {
    if (isDragging && earthModel) {
        const deltaMove = {
            x: e.offsetX - previousMousePosition.x,
            y: e.offsetY - previousMousePosition.y
        };

        earthGroup.rotation.y += deltaMove.x * 0.005;
        earthGroup.rotation.x += deltaMove.y * 0.005;
    }
    previousMousePosition = { x: e.offsetX, y: e.offsetY };
});

// ---- Screen Scroll Transition Logic ---- //
let currentScreen = 0; // 0 = Home, 1 = Login
let isScrolling = false;
let earthTargetRenderY = 0; // Target Y position for the earth

function switchScreen(index) {
    if (isScrolling || index < 0 || index > 1 || currentScreen === index) return;
    isScrolling = true;
    
    const screenHome = document.getElementById('screen-home');
    const screenLogin = document.getElementById('screen-login');
    
    if (index === 1) {
        screenHome.classList.add('hidden');
        screenHome.classList.remove('active');
        screenLogin.classList.add('active');
        earthTargetRenderY = 12; // Float the earth way up outside the camera view
    } else {
        screenHome.classList.remove('hidden');
        screenHome.classList.add('active');
        screenLogin.classList.remove('active');
        earthTargetRenderY = 0; // Bring the earth back to center
    }
    
    currentScreen = index;
    
    setTimeout(() => {
        isScrolling = false;
    }, 1500); // Timeout matches the 1.5s CSS transition
}

window.addEventListener('wheel', (e) => {
    if (e.deltaY > 50) switchScreen(1); // Scroll down
    else if (e.deltaY < -50) switchScreen(0); // Scroll up
});

let touchStartY = 0;
window.addEventListener('touchstart', (e) => { 
    touchStartY = e.touches[0].clientY; 
}, { passive: true });

window.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchStartY - touchEndY > 50) switchScreen(1); // Swipe Up -> Scroll Down
    else if (touchEndY - touchStartY > 50) switchScreen(0); // Swipe Down -> Scroll Up
});

// Go Back Button
document.querySelector('.btn-back').addEventListener('click', () => {
    switchScreen(0);
});

// Resize handler
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    windowHalfX = width / 2;
    windowHalfY = height / 2;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Keep centered horizontally on resize
    if(earthGroup) {
        earthGroup.position.x = 0;
        // Y position is handled securely in animate() now based on earthTargetRenderY
    }
});

// ---- Theme Toggle Logic ---- //
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');

let targetAmbientLight = 0.5;
let targetDirectionalLight = 2.5;

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    
    if (document.body.classList.contains('light-mode')) {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
        targetAmbientLight = 1.2; // brighten ambient to prevent harsh black shadows on white bg
        targetDirectionalLight = 2.0; 
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
        targetAmbientLight = 0.5; // restore cinematic dark space lighting
        targetDirectionalLight = 2.5;
    }
});

// ---- Animation Loop ---- //
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (earthModel) {
        // 1. Continuous slow rotation of the globe itself
        earthModel.rotation.y += 0.1 * delta;
    }

    if (!isDragging) {
        // 2. Responsive cursor follow applied to the group (parallax tilt)
        const targetX = mouseX * 0.001;
        const targetY = mouseY * 0.001;

        // Smooth interpolation (Ease-out)
        earthGroup.rotation.y += 0.05 * (targetX - earthGroup.rotation.y);
        earthGroup.rotation.x += 0.05 * (targetY - earthGroup.rotation.x);
    }

    // 3. Smooth lighting transition (lerp)
    ambientLight.intensity += (targetAmbientLight - ambientLight.intensity) * 0.03;
    directionalLight.intensity += (targetDirectionalLight - directionalLight.intensity) * 0.03;

    // 4. Smooth translation across screens
    earthGroup.position.y += (earthTargetRenderY - earthGroup.position.y) * 0.03;

    renderer.render(scene, camera);
}

// ---- Login Roles Logic ---- //
const roleBtns = document.querySelectorAll('.role-btn');
const loginVideo = document.getElementById('login-video');
const loginVideoSrc = document.getElementById('login-video-src');
const loginTitle = document.getElementById('login-title');
const loginSubtitle = document.getElementById('login-subtitle');

// Form Toggling logic
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');

let isSignupMode = false;

function updateTitle(roleTitle) {
    if (isSignupMode) {
        loginTitle.innerText = roleTitle.replace('Login', 'Registration');
        loginSubtitle.innerText = 'Create a new account to join the network';
    } else {
        loginTitle.innerText = roleTitle;
        loginSubtitle.innerText = 'Welcome back, enter your credentials entirely';
    }
}

showSignupBtn.addEventListener('click', () => {
    isSignupMode = true;
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    const activeBtn = document.querySelector('.role-btn.active');
    updateTitle(activeBtn.getAttribute('data-title'));
});

showLoginBtn.addEventListener('click', () => {
    isSignupMode = false;
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    const activeBtn = document.querySelector('.role-btn.active');
    updateTitle(activeBtn.getAttribute('data-title'));
});

roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active class
        roleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update Title depending on mode
        updateTitle(btn.getAttribute('data-title'));

        // Update Video Background
        const newVideoSrc = btn.getAttribute('data-video');
        if (loginVideoSrc.getAttribute('src') !== newVideoSrc) {
            loginVideo.style.opacity = '0'; // Fade out
            
            // Fix for ngo.mp4 black borders: Scale the video slightly to crop out the edges
            if (newVideoSrc.includes('ngo.mp4')) {
                loginVideo.style.transform = 'scale(1.2)';
            } else {
                loginVideo.style.transform = 'scale(1)';
            }

            setTimeout(() => {
                loginVideoSrc.setAttribute('src', newVideoSrc);
                loginVideo.load();
                loginVideo.play().catch(e => console.log('Video autoplay blocked:', e));
                loginVideo.style.opacity = '0.5'; // Fade back in to original opacity
            }, 300); // Wait for fade out to complete
        }
    });
});

// Start
animate();

// ---- Registration Logic ---- //
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('reg-fullname').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const address = document.getElementById('reg-address').value;
    const password = document.getElementById('reg-password').value;

    // Get the active role based on the selected sidebar button
    const activeBtn = document.querySelector('.role-btn.active');
    const role = activeBtn.getAttribute('data-role');

    // Button state update for UX
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Registering...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:5000/registeruser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                password_hash: password, // Note: Should hash in backend in real-world app
                role: role,
                phone_number: phone,
                address: address
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registration Successful! You can now log in.');
            // Reset form and switch back to login screen
            signupForm.reset();
            showLoginBtn.click();
        } else {
            alert('Registration Failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Could not connect to the server. Is the backend running?');
        console.error(error);
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});

// ---- Login Logic ---- //
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const activeBtn = document.querySelector('.role-btn.active');
    const role = activeBtn.getAttribute('data-role');

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Authenticating...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            // Redirect based on role
            if (role === 'customer') window.location.href = 'customer.html';
            else if (role === 'vendor') window.location.href = 'vendor.html';
            else if (role === 'ngo') window.location.href = 'ngo.html';
        } else {
            alert('Login Failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Could not connect to the server. Is the backend running?');
        console.error(error);
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});
