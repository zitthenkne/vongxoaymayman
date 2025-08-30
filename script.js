// Lấy các phần tử HTML cần thiết
const optionsInput = document.getElementById('options-input');
const createWheelBtn = document.getElementById('create-wheel-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const eliminationModeCheckbox = document.getElementById('elimination-mode');
const canvas = document.getElementById('spinner-canvas');
const spinBtn = document.getElementById('spin-btn');
const hitListContainer = document.getElementById('hit-list-container');
const hitList = document.getElementById('hit-list');
const resultPopup = document.getElementById('result-popup');
const resultText = document.getElementById('result-text');
const deleteSpinBtn = document.getElementById('delete-spin-btn');
const goBackBtn = document.getElementById('go-back-btn');
const createNewBtn = document.getElementById('create-new-btn');

const ctx = canvas.getContext('2d');
const shareResultBtn = document.getElementById('share-result-btn');

// Biến trạng thái của ứng dụng
let options = [];
let currentAngle = 0;
let isSpinning = false;
let spinTimeout;
let lastWinner = null;

// Bảng màu cho các múi của vòng quay
const colors = ["#FFD700", "#FF6347", "#ADFF2F", "#40E0D0", "#EE82EE", "#1E90FF", "#FF8C00", "#98FB98"];

// Hàm vẽ vòng quay
function drawWheel() {
    const numOptions = options.length;
    if (numOptions === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        spinBtn.classList.add('hidden');
        return;
    }
    // Work in CSS pixels (canvas is scaled for DPR in resizeCanvas)
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const arcSize = (2 * Math.PI) / numOptions;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 12;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    options.forEach((option, i) => {
        const angle = i * arcSize;
        
        // Vẽ múi
        ctx.beginPath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
        ctx.closePath();
        ctx.fill();

        // Vẽ đường viền
        ctx.stroke();

        // Vẽ chữ (bọc nếu quá dài)
        ctx.save();
        const textAngle = angle + arcSize / 2;
        const textX = centerX + Math.cos(textAngle) * radius * 0.65;
        const textY = centerY + Math.sin(textAngle) * radius * 0.65;
        ctx.translate(textX, textY);
        ctx.rotate(textAngle + Math.PI / 2);
        ctx.fillStyle = '#09203a';
        // If it's long, wrap by splitting into words
        const maxWidth = radius * 0.9;
        const words = option.split(' ');
        let line = '';
        const lines = [];
        for (let w of words) {
            const test = line ? (line + ' ' + w) : w;
            if (ctx.measureText(test).width > maxWidth) {
                if (line) lines.push(line);
                line = w;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        const lineHeight = 16;
        const startY = -((lines.length - 1) * lineHeight) / 2;
        for (let li = 0; li < lines.length; li++) {
            ctx.fillText(lines[li], 0, startY + li * lineHeight);
        }
        ctx.restore();
    });
    spinBtn.classList.remove('hidden');
}

// Resize canvas for high DPI displays
function resizeCanvas(){
    const ratio = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || parseInt(canvas.getAttribute('width')) || 400;
    const cssHeight = canvas.clientHeight || parseInt(canvas.getAttribute('height')) || 400;
    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    // scale drawing operations so 1 unit = 1 CSS pixel
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

window.addEventListener('resize', () => { resizeCanvas(); drawWheel(); });
resizeCanvas();

// Hàm quay vòng quay
function spin() {
    if (isSpinning || options.length === 0) return;
    isSpinning = true;

    // Số vòng quay ngẫu nhiên để hiệu ứng đẹp hơn
    const revolutions = Math.random() * 5 + 5; 
    const randomAngle = Math.random() * 2 * Math.PI;
    const totalRotation = revolutions * 2 * Math.PI + randomAngle;

    canvas.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
    canvas.style.transform = `rotate(${totalRotation}rad)`;

    clearTimeout(spinTimeout);
    spinTimeout = setTimeout(() => {
        const finalAngle = (totalRotation) % (2 * Math.PI);
        const arcSize = (2 * Math.PI) / options.length;
        // Chú ý: góc trong canvas bắt đầu từ 3 giờ và đi theo chiều kim đồng hồ
        // 0 rad ở bên phải. (3*PI/2) tương ứng với vị trí 12 giờ (trên cùng)
        const winningIndex = Math.floor(((2*Math.PI) - finalAngle + (3*Math.PI/2)) % (2*Math.PI) / arcSize);
        
        lastWinner = options[winningIndex];
        showResult(lastWinner);

        // Đặt lại transform để có thể quay lần nữa
        canvas.style.transition = 'none';
        canvas.style.transform = `rotate(${finalAngle}rad)`;
        isSpinning = false;
    }, 5000); // 5000ms = 5s, khớp với thời gian transition của CSS
}

// Hiển thị pop-up kết quả
function showResult(winner) {
    resultText.textContent = winner;
    resultPopup.classList.remove('hidden');
    
    // Bật/tắt nút "Xóa & Quay Tiếp" dựa trên chế độ loại trừ
    if (eliminationModeCheckbox.checked) {
        deleteSpinBtn.style.display = 'inline-block';
    } else {
        deleteSpinBtn.style.display = 'none';
    }
}

// Chia sẻ kết quả — dùng Web Share API nếu có, fallback copy
if (shareResultBtn) {
    shareResultBtn.addEventListener('click', async () => {
        const text = resultText.textContent || '';
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Kết quả vòng quay', text: `Kết quả là: ${text}`, url: window.location.href });
            } catch (err) {
                // user cancelled or failed
            }
        } else if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(`Kết quả là: ${text} — từ ${window.location.href}`);
                alert('Kết quả đã được sao chép vào clipboard.');
            } catch (err) {
                alert('Không thể sao chép tự động. Bạn có thể sao chép thủ công: ' + text);
            }
        } else {
            prompt('Sao chép kết quả thủ công:', text);
        }
    });
}

// Xử lý khi nhấn nút "Xóa & Quay Tiếp"
function handleDeleteAndSpin() {
    if (!lastWinner) return;

    // Thêm vào danh sách đã trúng
    const listItem = document.createElement('li');
    listItem.textContent = lastWinner;
    hitList.appendChild(listItem);
    hitListContainer.style.display = 'block';

    // Xóa lựa chọn khỏi danh sách
    options = options.filter(opt => opt !== lastWinner);
    
    lastWinner = null;
    resultPopup.classList.add('hidden');
    drawWheel();
}

// Đặt lại toàn bộ ứng dụng
function resetApp() {
    options = [];
    lastWinner = null;
    isSpinning = false;
    optionsInput.value = '';
    hitList.innerHTML = '';
    hitListContainer.style.display = 'none';
    eliminationModeCheckbox.checked = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    spinBtn.style.display = 'none';
    resultPopup.classList.add('hidden');
}


// === GẮN CÁC SỰ KIỆN CHO NÚT BẤM ===

// Nút "Tạo Vòng quay"
createWheelBtn.addEventListener('click', () => {
    // Lấy các lựa chọn, lọc bỏ các dòng trống
    const inputOptions = optionsInput.value.split('\n').filter(opt => opt.trim() !== '');
    if (inputOptions.length < 2) {
        alert("Vui lòng nhập ít nhất 2 lựa chọn.");
        return;
    }
    options = inputOptions;
    hitList.innerHTML = '';
    hitListContainer.style.display = 'none';
    drawWheel();
});

// Nút "Xóa tất cả"
clearAllBtn.addEventListener('click', resetApp);

// Nút "QUAY!"
spinBtn.addEventListener('click', spin);

// Nút "Xóa & Quay Tiếp" trên pop-up
deleteSpinBtn.addEventListener('click', handleDeleteAndSpin);

// Nút "Quay Lại" trên pop-up
goBackBtn.addEventListener('click', () => {
    resultPopup.classList.add('hidden');
});

// Nút "Tạo Mới" trên pop-up
createNewBtn.addEventListener('click', () => {
    resetApp();
});