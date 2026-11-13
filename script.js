// --- ИНИЦИАЛИЗАЦИЯ ХОЛСТА ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOverScreen');
const shopScreen = document.getElementById('shopScreen');
const finalScoreText = document.getElementById('finalScore');
const bestScoreText = document.getElementById('bestScore');
const totalItemsText = document.getElementById('totalItems');
const shopBalanceText = document.getElementById('shopBalance');
const skinsListDiv = document.getElementById('skinsList');

canvas.width = 400;
canvas.height = 600;

// --- КОНФИГУРАЦИЯ СКИНОВ ---
const BODY_SKINS = {
    black: { name: 'Черный', color: 'black', cost: 0 },
    ginger: { name: 'Рыжий', color: '#E67E22', cost: 50 },
    grey: { name: 'Серый', color: '#7F8C8D', cost: 75 },
    shinyWhite: { name: 'Блестящий', color: '#FFFFFF', cost: 125 }
};

const EYE_SKINS = {
    yellow: { name: 'Желтые', color: '#FFFF00', cost: 0 },
    green: { name: 'Зеленые', color: '#00FF00', cost: 60 },
    blue: { name: 'Голубые', color: '#00CCFF', cost: 80 },
    pink: { name: 'Розовые', color: '#FF69B4', cost: 100 }
};

const ACC_SKINS = {
    none: { name: 'Нет', color: 'transparent', cost: 0, icon: '' },
    collar: { name: 'Ошейник', color: '#32CD32', cost: 40, icon: '🎀' },
    star: { name: 'Звездочка', color: '#FFFF00', cost: 70, icon: '⭐' },
    halo: { name: 'Нимб', color: '#FFFFFF', cost: 150, icon: '😇' }
};

// БЕЗОПАСНЫЙ ДОСТУП К ПАМЯТИ
function saveToStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
}
function getFromStorage(key, defaultValue) {
    try {
        const val = localStorage.getItem(key);
        return val !== null ? val : defaultValue;
    } catch (e) { return defaultValue; }
}

let activeBodySkin = getFromStorage('pixelCatActiveBodySkin', 'black');
let unlockedBodySkins = JSON.parse(getFromStorage('pixelCatUnlockedBodySkins', '["black"]')) || ['black'];
let activeEyeSkin = getFromStorage('pixelCatActiveEyeSkin', 'yellow');
let unlockedEyeSkins = JSON.parse(getFromStorage('pixelCatUnlockedEyeSkins', '["yellow"]')) || ['yellow'];
let activeAccSkin = getFromStorage('pixelCatActiveAccSkin', 'none');
let unlockedAccSkins = JSON.parse(getFromStorage('pixelCatUnlockedAccSkins', '["none"]')) || ['none'];

const colors = {
    bgCanvas: '#2a2a2a', accent: '#FF0070', fragile: '#FFFFFF', moving: '#00F0FF',
    catEyes: 'yellow', starFar: '#444', starNear: '#888', fish: '#FFB84D',
    enemy: '#FF2A2A'
};

let isGameOver = false;
let score = 0, totalHeight = 0, collectiblesCount = 0;
let bestScore = parseInt(getFromStorage('pixelCatBestScore', '0')) || 0;
let allTimeCollectibles = parseInt(getFromStorage('pixelCatTotalItems', '0')) || 0;

const cat = {
    x: 185, y: 300, width: 30, height: 30,
    dy: 0, jumpForce: -10, gravity: 0.2, speed: 4,
    facing: 'right', scaleX: 1.0, scaleY: 1.0
};

const platforms = [], collectibles = [], particles = [], stars = [], enemies = [];
const platWidth = 60, platHeight = 10, segmentWidth = 6, starCount = 50;

let meowSound = null;
try { meowSound = new Audio('sounds/meow.mp3'); } catch (e) {}

// --- ЛОГИКА МАГАЗИНА ---
let currentTab = 'body';

function switchTab(tab) {
    currentTab = tab;
    if (document.getElementById('tab-body')) document.getElementById('tab-body').classList.toggle('active', tab === 'body');
    if (document.getElementById('tab-eyes')) document.getElementById('tab-eyes').classList.toggle('active', tab === 'eyes');
    if (document.getElementById('tab-acc')) document.getElementById('tab-acc').classList.toggle('active', tab === 'acc');
    renderShop();
}

function openShop() {
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (shopScreen) shopScreen.style.display = 'flex';
    renderShop();
}

function closeShop() {
    if (shopScreen) shopScreen.style.display = 'none';
    if (gameOverScreen) gameOverScreen.style.display = 'flex';
}

function renderShop() {
    if (!shopBalanceText || !skinsListDiv) return;

    shopBalanceText.innerText = `Рыбы: ${allTimeCollectibles}`;
    skinsListDiv.innerHTML = '';

    const config = currentTab === 'body' ? BODY_SKINS : (currentTab === 'eyes' ? EYE_SKINS : ACC_SKINS);
    const unlocked = currentTab === 'body' ? unlockedBodySkins : (currentTab === 'eyes' ? unlockedEyeSkins : unlockedAccSkins);
    const active = currentTab === 'body' ? activeBodySkin : (currentTab === 'eyes' ? activeEyeSkin : activeAccSkin);

    for (let id in config) {
        const skin = config[id];
        const isUnlocked = unlocked.includes(id);
        const isActive = active === id;

        let previewClass = '';
        let previewStyle = '';

        if (currentTab === 'acc') {
            if (id === 'collar') previewClass = 'preview-collar';
            else if (id === 'star') previewClass = 'preview-star';
            else if (id === 'halo') previewClass = 'preview-halo';
            previewStyle = 'background: transparent;';
        } else {
            previewStyle = `background: ${skin.color};`;
        }

        const costText = isUnlocked ? 'Куплено' : skin.cost + ' 🐟';

        const div = document.createElement('div');
        div.className = `skin-item ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;

        div.innerHTML = `
            <div class="skin-preview ${previewClass}" style="${previewStyle}"></div>
            <div class="skin-name">${skin.name}</div>
            <div class="skin-cost">${costText}</div>
        `;

        div.onclick = () => buyOrEquip(id);
        skinsListDiv.appendChild(div);
    }
}

function buyOrEquip(id) {
    const config = currentTab === 'body' ? BODY_SKINS : (currentTab === 'eyes' ? EYE_SKINS : ACC_SKINS);
    const skin = config[id];
    let unlocked = currentTab === 'body' ? unlockedBodySkins : (currentTab === 'eyes' ? unlockedEyeSkins : unlockedAccSkins);

    if (!unlocked.includes(id)) {
        if (allTimeCollectibles >= skin.cost) {
            allTimeCollectibles -= skin.cost;
            saveToStorage('pixelCatTotalItems', allTimeCollectibles);
            unlocked.push(id);

            if (currentTab === 'body') saveToStorage('pixelCatUnlockedBodySkins', JSON.stringify(unlockedBodySkins));
            else if (currentTab === 'eyes') saveToStorage('pixelCatUnlockedEyeSkins', JSON.stringify(unlockedEyeSkins));
            else saveToStorage('pixelCatUnlockedAccSkins', JSON.stringify(unlockedAccSkins));
        } else {
            alert(`Нужно ${skin.cost} 🐟 для покупки!`);
            return;
        }
    }

    if (currentTab === 'body') {
        activeBodySkin = id;
        saveToStorage('pixelCatActiveBodySkin', activeBodySkin);
    } else if (currentTab === 'eyes') {
        activeEyeSkin = id;
        saveToStorage('pixelCatActiveEyeSkin', activeEyeSkin);
    } else {
        activeAccSkin = id;
        saveToStorage('pixelCatActiveAccSkin', activeAccSkin);
    }

    renderShop();
}

// --- ИНИЦИАЛИЗАЦИЯ ФОНА И ОБЪЕКТОВ ---
function initBackground() {
    stars.length = 0;
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speedFactor: Math.random() * 0.5 + 0.1,
            color: Math.random() > 0.5 ? colors.starFar : colors.starNear
        });
    }
}

function getRandomPlatformType() {
    if (totalHeight < 500) return { type: 'normal' };
    const rand = Math.random();
    if (rand < 0.7) return { type: 'normal' };
    if (rand < 0.85) return { type: 'fragile' };
    return { type: 'moving', speedX: (Math.random() + 1) * (Math.random() > 0.5 ? 1 : -1) };
}

function createPlatforms() {
    platforms.length = 0;
    collectibles.length = 0;
    enemies.length = 0;

    platforms.push({ x: cat.x - (platWidth / 2) + (cat.width / 2), y: cat.y + cat.height + 10, type: 'normal', hits: 0, broken: false, damageMap: [] });
    for (let i = 1; i < 10; i++) {
        const pType = getRandomPlatformType();
        const p = { x: Math.random() * (canvas.width - platWidth), y: i * 80, ...pType, hits: 0, broken: false, damageMap: [] };
        platforms.push(p);
        if (Math.random() < 0.5) {
            collectibles.push({ x: p.x + Math.random() * (platWidth - 15), y: p.y - 20 - Math.random() * 20, width: 15, height: 15, type: 'fish', collected: false });
        }
    }
}

// --- УПРАВЛЕНИЕ (КЛАВИАТУРА + ТАЧ ПО ПОЛОВИНАМ ЭКРАНА) ---
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

function handleTouchControl(e) {
    if (isGameOver) return;
    if (e.cancelable) e.preventDefault();

    if (e.touches.length === 0) {
        keys['ArrowLeft'] = false;
        keys['ArrowRight'] = false;
        return;
    }

    const latestTouch = e.touches[e.touches.length - 1];
    const screenCenter = window.innerWidth / 2;

    if (latestTouch.clientX < screenCenter) {
        keys['ArrowLeft'] = true;
        keys['ArrowRight'] = false;
    } else {
        keys['ArrowRight'] = true;
        keys['ArrowLeft'] = false;
    }
}

window.addEventListener('touchstart', handleTouchControl, { passive: false });
window.addEventListener('touchmove', handleTouchControl, { passive: false });
window.addEventListener('touchend', handleTouchControl, { passive: false });
window.addEventListener('touchcancel', () => {
    keys['ArrowLeft'] = false;
    keys['ArrowRight'] = false;
});

// --- ЧАСТИЦЫ И ОТРИСОВКА ---
function spawnParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({ x: x + Math.random() * platWidth, y: y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, size: Math.random() * 4 + 2, color: color, life: 1.0 });
    }
}

function spawnCatSparkles() {
    for (let i = 0; i < 30; i++) {
        particles.push({ x: cat.x + Math.random() * cat.width, y: cat.y + Math.random() * cat.height, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, size: Math.random() * 3 + 1, color: '#FFFFFF', life: 0.6 });
    }
}

function drawAccessory() {
    const acc = activeAccSkin;
    if (acc === 'none') return;
    ctx.save();
    if (acc === 'collar') {
        ctx.fillStyle = ACC_SKINS.collar.color;
        ctx.fillRect(5, cat.height - 8, cat.width - 10, 4);
    } else if (acc === 'star') {
        ctx.fillStyle = ACC_SKINS.star.color;
        const sx = cat.width / 2;
        const sy = -10;
        ctx.fillRect(sx - 1, sy - 3, 2, 6);
        ctx.fillRect(sx - 3, sy - 1, 6, 2);
    } else if (acc === 'halo') {
        ctx.strokeStyle = ACC_SKINS.halo.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'white';
        ctx.beginPath();
        ctx.ellipse(cat.width / 2, -12, 12, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    ctx.restore();
}

function drawCat() {
    ctx.save();
    ctx.translate(cat.x + cat.width / 2, cat.y + cat.height / 2);
    ctx.scale(cat.scaleX, cat.scaleY);
    ctx.translate(-cat.width / 2, -cat.height / 2);

    let bodyColor = BODY_SKINS[activeBodySkin].color;
    if (bodyColor === '#FFFFFF') {
        const shine = Math.sin(Date.now() * 0.005) * 20;
        bodyColor = `rgb(${230 + shine}, ${230 + shine}, ${255})`;
    }
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, -8); ctx.lineTo(12, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cat.width - 12, 0); ctx.lineTo(cat.width - 7, -8); ctx.lineTo(cat.width, 0); ctx.fill();
    const wave = Math.sin(Date.now() * 0.01) * 5;
    if (cat.facing === 'right') ctx.fillRect(-5 + wave, 15, 8, 12);
    else ctx.fillRect(cat.width - 3 + wave, 15, 8, 12);
    ctx.fillRect(0, 0, cat.width, cat.height);
    drawAccessory();

    ctx.fillStyle = EYE_SKINS[activeEyeSkin].color;
    if (cat.facing === 'right') { ctx.fillRect(18, 7, 6, 6); ctx.fillRect(25, 7, 6, 6); }
    else { ctx.fillRect(5, 7, 6, 6); ctx.fillRect(12, 7, 6, 6); }
    ctx.restore();
}

function drawPlatforms() {
    platforms.forEach(p => {
        if (p.broken) return;
        if (p.type === 'fragile') {
            ctx.globalAlpha = 1.0 - (p.hits * 0.3);
            ctx.fillStyle = colors.fragile;
            for (let i = 0; i < platWidth; i += segmentWidth) {
                if (!p.damageMap.includes(i)) ctx.fillRect(p.x + i, p.y, segmentWidth, platHeight);
            }
            ctx.globalAlpha = 1.0;
        } else {
            ctx.fillStyle = p.type === 'moving' ? colors.moving : colors.accent;
            ctx.fillRect(p.x, p.y, platWidth, platHeight);
        }
    });
}

function drawCollectibles() {
    collectibles.forEach(item => {
        if (item.collected) return;
        ctx.fillStyle = colors.fish;
        ctx.beginPath(); ctx.ellipse(item.x + 7, item.y + 7, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(item.x, item.y + 7); ctx.lineTo(item.x - 4, item.y + 3); ctx.lineTo(item.x - 4, item.y + 11); ctx.fill();
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.defeated) return;
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        if (enemy.speedX < 0) ctx.scale(-1, 1);

        // Тело птицы
        ctx.fillStyle = colors.enemy;
        ctx.fillRect(-12, -6, 22, 12);

        // Голова
        ctx.fillRect(6, -10, 10, 10);

        // Хвост
        ctx.fillRect(-18, -4, 6, 4);
        ctx.fillRect(-16, 0, 4, 4);

        // Клюв
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(16, -7);
        ctx.lineTo(22, -4);
        ctx.lineTo(16, -1);
        ctx.fill();

        // Глаз
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(11, -8, 3, 3);

        // Анимация взмаха крыла
        const wingFlap = Math.sin(Date.now() * 0.025) * 7;
        ctx.fillStyle = '#FF7070';
        ctx.fillRect(-4, -2 + (wingFlap > 0 ? 0 : wingFlap), 10, Math.abs(wingFlap) + 3);

        ctx.restore();
    });
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0; p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawControlHint() {
    const maxHintHeight = 600;
    if (totalHeight >= maxHintHeight) return;

    ctx.save();
    let alpha = 0.6;
    if (totalHeight > 350) {
        alpha = (1 - (totalHeight - 350) / (maxHintHeight - 350)) * 0.6;
    }
    ctx.globalAlpha = Math.max(0, alpha);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height - 110);
    ctx.lineTo(canvas.width / 2, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('← ВЛЕВО', canvas.width * 0.25, canvas.height - 65);
    ctx.fillText('ВПРАВО →', canvas.width * 0.75, canvas.height - 65);

    ctx.restore();
}

function drawScore() {
    ctx.fillStyle = 'white'; ctx.font = '20px IBM Plex Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 30);
    ctx.fillText(`Рыбы: ${collectiblesCount}`, 20, 55);
}

// --- ОБНОВЛЕНИЕ ФИЗИКИ И ПЕРЕРАБОТКА ---
function update() {
    if (isGameOver) return;
    if (keys['ArrowLeft'] || keys['KeyA']) { cat.x -= cat.speed; cat.facing = 'left'; }
    if (keys['ArrowRight'] || keys['KeyD']) { cat.x += cat.speed; cat.facing = 'right'; }
    if (cat.x + cat.width < 0) cat.x = canvas.width;
    if (cat.x > canvas.width) cat.x = -cat.width;

    cat.dy += cat.gravity; cat.y += cat.dy;
    const stretch = Math.abs(cat.dy) * 0.0400;
    cat.scaleY = 1.0 + stretch; cat.scaleX = 1.0 - stretch * 0.5;

    const scrollThreshold = 250;
    if (cat.y < scrollThreshold) {
        let diff = scrollThreshold - cat.y;
        cat.y = scrollThreshold; totalHeight += diff; score += diff * 0.1;
        platforms.forEach(p => p.y += diff);
        stars.forEach(s => s.y += diff * s.speedFactor);
        collectibles.forEach(c => c.y += diff);
        enemies.forEach(e => e.y += diff);
    }

    platforms.forEach(p => {
        if (p.type === 'moving') {
            p.x += p.speedX;
            if (p.x <= 0 || p.x + platWidth >= canvas.width) p.speedX *= -1;
        }
    });

    // Движение птиц и проверка столкновения
    enemies.forEach(enemy => {
        if (enemy.defeated) return;
        enemy.x += enemy.speedX;
        if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
            enemy.speedX *= -1;
        }

        const pad = 3;
        const isColliding =
            cat.x + pad < enemy.x + enemy.width - pad &&
            cat.x + cat.width - pad > enemy.x + pad &&
            cat.y + pad < enemy.y + enemy.height - pad &&
            cat.y + cat.height - pad > enemy.y + pad;

        if (isColliding) {
            // Проверяем, падает ли кот сверху на верхнюю половину птицы
            const prevCatBottom = (cat.y - cat.dy) + cat.height;
            const isStompFromAbove = cat.dy > 0 && prevCatBottom <= enemy.y + enemy.height * 0.65;

            if (isStompFromAbove) {
                // Прыжок по верху птицы
                enemy.defeated = true;
                cat.scaleY = 0.10;
                cat.scaleX = 0.40;
                cat.dy = cat.jumpForce * 1.15;
                score += 100;
                spawnParticles(enemy.x, enemy.y, colors.enemy);
            } else {
                // Удар снизу или сбоку = проигрыш
                spawnParticles(cat.x, cat.y, colors.enemy);
                endGame();
            }
        }
    });

    collectibles.forEach(item => {
        if (!item.collected && cat.x < item.x + item.width && cat.x + cat.width > item.x && cat.y < item.y + item.height && cat.y + cat.height > item.y) {
            item.collected = true;
            collectiblesCount++;
            score += 50;
            spawnParticles(item.x, item.y, colors.fish);
        }
    });

    if (cat.dy > 0) {
        platforms.forEach(p => {
            if (!p.broken && cat.x < p.x + platWidth && cat.x + cat.width > p.x && cat.y + cat.height > p.y && cat.y + cat.height < p.y + platHeight + cat.dy) {
                cat.scaleY = 0.10; cat.scaleX = 0.40; cat.dy = cat.jumpForce;
                if (activeBodySkin === 'shinyWhite') spawnCatSparkles();
                if (p.type === 'fragile') {
                    p.hits++;
                    if (p.hits < 3) {
                        spawnParticles(p.x, p.y + platHeight, colors.fragile);
                        const holesAmount = p.hits * 3;
                        for (let i = 0; i < holesAmount; i++) {
                            const randomSegment = Math.floor(Math.random() * (platWidth / segmentWidth)) * segmentWidth;
                            if (!p.damageMap.includes(randomSegment)) p.damageMap.push(randomSegment);
                        }
                    } else { p.broken = true; spawnParticles(p.x, p.y + platHeight, colors.fragile); }
                }
            }
        });
    }
    if (cat.y > canvas.height) endGame();
}

function applyAnimationLerp() {
    const lerpSpeed = 0.016;
    cat.scaleX += (1.0 - cat.scaleX) * lerpSpeed;
    cat.scaleY += (1.0 - cat.scaleY) * lerpSpeed;
}

function handleRecycle() {
    platforms.forEach(p => {
        if (p.y > canvas.height || p.broken) {
            const pType = getRandomPlatformType();
            let highestY = 0;
            if (platforms.length > 0) highestY = Math.min(...platforms.map(pl => pl.y));
            if (highestY === Infinity || isNaN(highestY)) highestY = 0;

            p.y = highestY - (60 + Math.random() * 40);
            p.x = Math.random() * (canvas.width - platWidth);
            p.type = pType.type; p.broken = false; p.hits = 0; p.damageMap = [];
            if (pType.speedX) p.speedX = pType.speedX;

            // Генерация новой рыбки над переработанной платформой (шанс 40%)
            if (Math.random() < 0.4) {
                collectibles.push({
                    x: p.x + Math.random() * (platWidth - 15),
                    y: p.y - 25 - Math.random() * 15,
                    width: 15,
                    height: 15,
                    type: 'fish',
                    collected: false
                });
            }

            // Постоянный спавн птиц после 400 пикселей высоты (шанс 18%)
            if (totalHeight > 400 && Math.random() < 0.18) {
                const tooClose = enemies.some(e => Math.abs(e.y - (p.y - 35)) < 180);
                if (!tooClose) {
                    enemies.push({
                        x: Math.random() * (canvas.width - 36),
                        y: p.y - 35,
                        width: 36,
                        height: 16,
                        speedX: (Math.random() * 1.5 + 1.2) * (Math.random() > 0.5 ? 1 : -1),
                        defeated: false
                    });
                }
            }
        }
    });

    for (let i = collectibles.length - 1; i >= 0; i--) {
        if (collectibles[i].collected || collectibles[i].y > canvas.height) {
            collectibles.splice(i, 1);
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].defeated || enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
        }
    }

    stars.forEach(s => { if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; } });
}

function endGame() {
    try {
        isGameOver = true;
        let finalScore = Math.floor(score);
        if (finalScore > bestScore) { bestScore = finalScore; saveToStorage('pixelCatBestScore', bestScore); }
        allTimeCollectibles += collectiblesCount;
        saveToStorage('pixelCatTotalItems', allTimeCollectibles);
        if (meowSound) meowSound.play().catch(e => {});
        if (finalScoreText) finalScoreText.innerText = `Твой счёт: ${finalScore}`;
        if (bestScoreText) bestScoreText.innerText = `Рекорд: ${bestScore}`;
        if (totalItemsText) totalItemsText.innerText = `Всего рыбов: ${allTimeCollectibles}`;
        if (gameOverScreen) gameOverScreen.style.display = 'flex';
    } catch (e) { console.error(e); }
}

function resetGame() {
    score = 0; totalHeight = 0; collectiblesCount = 0;
    cat.x = 185; cat.y = 300; cat.dy = 0; cat.facing = 'right';
    cat.scaleX = 1.0; cat.scaleY = 1.0;
    isGameOver = false;
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (shopScreen) shopScreen.style.display = 'none';
    createPlatforms(); initBackground(); particles.length = 0;
    renderShop();
}

function loop() {
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        update(); applyAnimationLerp(); handleRecycle();

        stars.forEach(s => {
            ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        });

        drawPlatforms(); drawCollectibles(); drawEnemies(); drawParticles(); drawCat();
        drawControlHint();
        drawScore();
    } catch (e) { console.error(e); }
    requestAnimationFrame(loop);
}

// --- ЗАПУСК ИГРЫ ---
initBackground();
createPlatforms();
loop();