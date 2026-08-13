let dice = [0, 0, 0, 0, 0];
let held = [false, false, false, false, false];
let rollsRemaining = 3;
let targetScore = 0;
let totalScore = 0;
let yachtScored = false;
let wildcardActive = false;
let scorecard = [];
let isInfiniteMode = false;

const rollSound1 = new Audio("assets/dice-roll-1.mp3");
const rollSound2 = new Audio("assets/dice-roll-2.mp3");
const shakeSound = new Audio("assets/dice-shake.mp3");

const diceFaces = [
   "assets/dice1.svg",
   "assets/dice2.svg",
   "assets/dice3.svg",
   "assets/dice4.svg",
   "assets/dice5.svg",
   "assets/dice6.svg"
];

diceFaces.forEach(src => {
   const img = new Image();
   img.src = src;
});

const placeholderDice = "assets/dice-placeholder.svg";

const categories = [
   { name: "Ones", weight: 8 },
   { name: "Twos", weight: 10 },
   { name: "Threes", weight: 10 },
   { name: "Fours", weight: 10 },
   { name: "Fives", weight: 10 },
   { name: "Sixes", weight: 10 },
   { name: "Chance", weight: 10 },
   { name: "Three of a Kind", weight: 8 },
   { name: "Four of a Kind", weight: 5 },
   { name: "Full House", weight: 7 },
   { name: "Small Straight", weight: 8 },
   { name: "Large Straight", weight: 5 },
   { name: "Yacht", weight: 2 }
];

const categoryOrder = [
   "Ones", "Twos", "Threes", "Fours", "Fives", "Sixes",
   "Three of a Kind", "Four of a Kind", "Full House",
   "Small Straight", "Large Straight", "Chance", "Yacht"
];

const MAX_SCORES = {
    "ones": 4, "twos": 8, "threes": 12, "fours": 16, "fives": 20, "sixes": 24,
    "three of a kind": 29, "four of a kind": 29, "full house": 25,
    "small straight": 30, "large straight": 40, "chance": 30
};

// --- DAILY GENERATION & RANDOMNESS ---

let dailySeedOffset = 0;
function getDailyPseudoRandom() {
    const puzzleNum = typeof setDailyPuzzleNumber === "function" ? setDailyPuzzleNumber() : 1;
    dailySeedOffset++;
    const x = Math.sin((puzzleNum * 9999) + dailySeedOffset) * 10000;
    return x - Math.floor(x);
}

function pickWeightedCategory(pool) {
    let totalWeight = pool.reduce((sum, cat) => sum + cat.weight, 0);
    let randomNum = (isInfiniteMode ? Math.random() : getDailyPseudoRandom()) * totalWeight;

    for (let i = 0; i < pool.length; i++) {
        if (randomNum < pool[i].weight) {
            return pool.splice(i, 1)[0];
        }
        randomNum -= pool[i].weight;
    }
    return pool.pop();
}

function getPossibleCategoryScores(category) {
    switch (category) {
        case "Ones": return [0,1,2,3,4,5];
        case "Twos": return [0,2,4,6,8,10];
        case "Threes": return [0,3,6,9,12,15];
        case "Fours": return [0,4,8,12,16,20];
        case "Fives": return [0,5,10,15,20,25];
        case "Sixes": return [0,6,12,18,24,30];
        case "Three of a Kind":
        case "Four of a Kind":
            return [0,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];
        case "Full House": return [0,25];
        case "Small Straight": return [0,30];
        case "Large Straight": return [0,40];
        case "Yacht": return [0,50];
        case "Chance": return [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];
        default: return [0];
    }
}

function getPossibleTotalScores(selectedCategories) {
    let possibleTotals = [0];
    for (let row of selectedCategories) {
        let catName = typeof row === "string" ? row : row.category;
        let categoryScores = getPossibleCategoryScores(catName);
        let newTotals = [];
        for (let current of possibleTotals) {
            for (let score of categoryScores) {
                newTotals.push(current + score);
            }
        }
        possibleTotals = newTotals;
    }
    return possibleTotals;
}

function generateDailyChallenge() {
    dailySeedOffset = 0;
    scorecard = [];
    let pool = [...categories];
    let eliteCount = 0;
    const eliteCategories = ["Yacht", "Large Straight", "Four of a Kind"];

    while (scorecard.length < 3) {
        const chosen = pickWeightedCategory(pool);
        const isElite = eliteCategories.includes(chosen.name);

        if (isElite && eliteCount >= 2) {
            pool.push(chosen);
            continue;
        }

        if (isElite) eliteCount++;

        scorecard.push({
            category: chosen.name,
            score: null,
            filled: false
        });
    }

    // --- OG GAME BALANCE MATH ---
    let selectedCategories = scorecard.map(row => row.category);
    let possibleScores = getPossibleTotalScores(selectedCategories).filter(score => score > 0);

    let highestPossible = Math.max(...possibleScores);
    possibleScores = possibleScores.filter(score => score >= highestPossible * 0.27);
    possibleScores.sort((a, b) => a - b);

    let weightedScores = [];
    for (let score of possibleScores) {
        let weight = Math.max(1, possibleScores.length - possibleScores.indexOf(score));
        for (let i = 0; i < weight; i++) {
            weightedScores.push(score);
        }
    }

    const puzzleNum = typeof setDailyPuzzleNumber === "function" ? setDailyPuzzleNumber() : 1;
    const targetIndex = (puzzleNum - 1) % weightedScores.length;
    targetScore = weightedScores[targetIndex];

    const targetScoreEl = document.getElementById("targetScore");
    if (targetScoreEl) {
        targetScoreEl.textContent = "Goal: " + targetScore + "+";
    }
}

// --- STORAGE & STATE FUNCTIONS ---

function getTodayStorageKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `yachtle_daily_${year}-${month}-${day}`;
}

function saveActiveDailyState() {
    if (isInfiniteMode) return;
    try {
        const key = getTodayStorageKey() + "_active";
        const dataToSave = {
            dice: dice,
            held: held,
            rollsRemaining: rollsRemaining,
            scorecard: scorecard,
            totalScore: totalScore,
            targetScore: targetScore,
            yachtScored: yachtScored
        };
        localStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (e) {
        console.error("Failed to save active state:", e);
    }
}

function clearActiveDailyState() {
    try {
        const key = getTodayStorageKey() + "_active";
        localStorage.removeItem(key);
    } catch (e) {
        console.error("Failed to clear active state:", e);
    }
}

function saveCompletedState() {
    try {
        clearActiveDailyState();
        const key = getTodayStorageKey();
        const dataToSave = {
            scorecard: scorecard,
            totalScore: totalScore,
            targetScore: targetScore,
            isCompleted: true
        };
        localStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (e) {
        console.error("Failed to save completed state:", e);
    }
}

function loadDailyState() {
    const todayKey = getTodayStorageKey();
    const savedData = localStorage.getItem(todayKey);
   
    // 1. Check if completed
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
           
            if (parsed && parsed.isCompleted) {
                if (typeof parsed.totalScore !== "undefined") totalScore = parsed.totalScore;
                if (Array.isArray(parsed.scorecard)) scorecard = parsed.scorecard;
                if (parsed.targetScore) targetScore = parsed.targetScore;

                const targetScoreEl = document.getElementById("targetScore");
                if (targetScoreEl && targetScore) targetScoreEl.textContent = `Goal: ${targetScore}+`;
               
                updateTotalScore();
                displayScorecard();
                displayDice();
                lockGameBoard();

                triggerGameCompletionSequence();
                return true;
            }
        } catch (e) {
            console.error("Error loading completed state:", e);
        }
    }

    // 2. Check for mid-game active state
    const activeKey = todayKey + "_active";
    const activeData = localStorage.getItem(activeKey);
    if (activeData) {
        try {
            const parsed = JSON.parse(activeData);
            if (parsed) {
                if (Array.isArray(parsed.dice)) dice = parsed.dice;
                if (Array.isArray(parsed.held)) held = parsed.held;
                if (typeof parsed.rollsRemaining !== "undefined") rollsRemaining = parsed.rollsRemaining;
                if (Array.isArray(parsed.scorecard)) scorecard = parsed.scorecard;
                if (typeof parsed.totalScore !== "undefined") totalScore = parsed.totalScore;
                if (parsed.targetScore) targetScore = parsed.targetScore;
                if (typeof parsed.yachtScored !== "undefined") yachtScored = parsed.yachtScored;

                const targetScoreEl = document.getElementById("targetScore");
                if (targetScoreEl && targetScore) targetScoreEl.textContent = `Goal: ${targetScore}+`;

                updateTotalScore();
                updateRollCounter();
                displayDice();
                displayScorecard();
                return true;
            }
        } catch (e) {
            console.error("Error loading active state:", e);
        }
    }

    return false;
}

// --- GAMEPLAY FUNCTIONS ---

function isYachtRoll() {
   if (dice.includes(0)) return false;
   return dice.every(val => val === dice[0]);
}

function triggerYachtBanner() {
   const banner = document.createElement("div");
   banner.className = "yacht-banner";
   banner.innerHTML = "YACHT!";
   document.body.appendChild(banner);
   setTimeout(() => banner.remove(), 2200);
}

function rollDice() {
    if (rollsRemaining <= 0) return;

    shakeSound.currentTime = 0;
    shakeSound.play();

    rollsRemaining--;
    updateRollCounter();

    const diceImages = document.querySelectorAll(".die-svg");

    function finishRoll() {
        for (let i = 0; i < 5; i++) {
            if (!held[i]) {
                dice[i] = Math.floor(Math.random() * 6) + 1;
            }
        }

        if (isYachtRoll()) {
            triggerYachtBanner();
            wildcardActive = true;
        } else {
            wildcardActive = false;
        }

        displayDice();
        displayScorecard();

        // Save active state immediately after rolls are assigned
        if (!isInfiniteMode) {
            saveActiveDailyState();
        }

        const chosenSound = Math.random() < 0.5 ? rollSound1 : rollSound2;
        chosenSound.currentTime = 0;
        chosenSound.play();
    }

    function rollAnimationStep(delay = 50, elapsed = 0) {
        diceImages.forEach((img, i) => {
            if (!held[i]) {
                img.src = diceFaces[Math.floor(Math.random() * 6)];
            }
        });

        elapsed += delay;

        if (elapsed < 500) {
            setTimeout(() => {
                rollAnimationStep(delay + 30, elapsed);
            }, delay);
        } else {
            finishRoll();
        }
    }

    rollAnimationStep();
}

function updateRollCounter() {
    const dotsContainer = document.getElementById("rollDots");
    if (!dotsContainer) return;

    let dotsHtml = "";
    for (let i = 0; i < 3; i++) {
        const isActive = i < rollsRemaining ? "active" : "";
        dotsHtml += `<span class="dot ${isActive}"></span>`;
    }
 
    dotsContainer.innerHTML = dotsHtml;
    const rollBtn = document.getElementById("rollButton");
    if (rollBtn) rollBtn.disabled = (rollsRemaining === 0);
}

function displayDice() {
    const container = document.getElementById("diceContainer");
    if (!container) return;
    container.innerHTML = "";

    const isYacht = isYachtRoll();

    for (let i = 0; i < 5; i++) {
        const die = document.createElement("div");
        die.className = "die";

        if (held[i]) die.classList.add("held");
        if (isYacht && dice[i] !== 0) die.classList.add("is-yacht");

        const imageSource = dice[i] === 0 ? placeholderDice : diceFaces[dice[i] - 1];
        const altText = dice[i] === 0 ? "Placeholder die" : `Die ${dice[i]}`;

        die.innerHTML = `
            <img
                src="${imageSource}"
                class="die-svg"
                alt="${altText}"
                width="100"
                height="100"
            >
        `;

        die.addEventListener("click", function () {
            const rollBtn = document.getElementById("rollButton");
            if (dice[i] !== 0 && rollBtn && !rollBtn.disabled) {
                held[i] = !held[i];
                if (held[i]) die.classList.add("held");
                else die.classList.remove("held");

                // Save held status changes mid-turn
                if (!isInfiniteMode) {
                    saveActiveDailyState();
                }
            }
        });

        container.appendChild(die);
    }
}

function displayScorecard() {
    const container = document.getElementById("scorecard");
    if (!container) return;
    container.innerHTML = "";

    scorecard.sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category));

    const isYachtInChallenge = scorecard.some(row => row.category === "Yacht");
    const hasRolled = typeof rollsRemaining !== "undefined" && rollsRemaining < 3;
    const isYacht = hasRolled && isYachtRoll();

    for (let row of scorecard) {
        const button = document.createElement("button");
        button.className = "scoreButton";

        let isWildcardEligible = false;

        if (isYacht && !row.filled) {
            if (isYachtInChallenge && !yachtScored) {
                if (row.category === "Yacht") isWildcardEligible = true;
            } else {
                isWildcardEligible = true;
            }
        }

        if (isWildcardEligible) {
            button.classList.add("wildcard-active");
        }

        button.innerHTML = `
            <span class="category-name">${row.category}</span>
            <span class="category-score">${row.score ?? ""}</span>
        `;

        if (row.filled) {
            button.disabled = true;
        }

        button.addEventListener("click", function () {
            if (!row.filled) {
                if (typeof rollsRemaining !== "undefined" && rollsRemaining === 3) {
                    row.score = 0;
                } else if (isWildcardEligible) {
                    row.score = 50;
                    if (row.category === "Yacht") yachtScored = true;
                } else {
                    row.score = calculateScore(row.category);
                    if (row.category === "Yacht" && row.score === 50) yachtScored = true;
                }

                row.filled = true;
                totalScore += row.score;

                updateTotalScore();
                resetTurn();
                displayScorecard();

                if (!isInfiniteMode) {
                    saveActiveDailyState();
                }

                checkGameEnd();
            }
        });

        container.appendChild(button);
    }
}

function calculateScore(category) {
   let total = 0;
   let counts = {};

   for (let value of dice) {
       counts[value] = (counts[value] || 0) + 1;
   }

   if (category === "Ones") total = (counts[1] || 0) * 1;
   else if (category === "Twos") total = (counts[2] || 0) * 2;
   else if (category === "Threes") total = (counts[3] || 0) * 3;
   else if (category === "Fours") total = (counts[4] || 0) * 4;
   else if (category === "Fives") total = (counts[5] || 0) * 5;
   else if (category === "Sixes") total = (counts[6] || 0) * 6;
   else if (category === "Three of a Kind" || category === "Four of a Kind") {
       let needed = category === "Three of a Kind" ? 3 : 4;
       for (let value in counts) {
           if (counts[value] >= needed) {
               total = dice.reduce((a, b) => a + b, 0);
           }
       }
   } else if (category === "Full House") {
       let three = false, two = false;
       for (let value in counts) {
           if (counts[value] === 3) three = true;
           if (counts[value] === 2) two = true;
       }
       if (three && two) total = 25;
   } else if (category === "Small Straight") {
       let nums = Object.keys(counts).map(Number);
       if (
           [1,2,3,4].every(x => nums.includes(x)) ||
           [2,3,4,5].every(x => nums.includes(x)) ||
           [3,4,5,6].every(x => nums.includes(x))
       ) total = 30;
   } else if (category === "Large Straight") {
       let nums = Object.keys(counts).map(Number);
       if (
           [1,2,3,4,5].every(x => nums.includes(x)) ||
           [2,3,4,5,6].every(x => nums.includes(x))
       ) total = 40;
   } else if (category === "Yacht") {
       if (Object.values(counts).includes(5)) total = 50;
   } else if (category === "Chance") {
       total = dice.reduce((a, b) => a + b, 0);
   }

   return total;
}

function updateTotalScore() {
   const currentScoreEl = document.getElementById("currentScore") || document.getElementById("userScore");
   if (currentScoreEl) {
       currentScoreEl.textContent = "Your Score: " + totalScore;
   }
}

function resetTurn() {
   dice = [0, 0, 0, 0, 0];
   held = [false, false, false, false, false];
   rollsRemaining = 3;
   wildcardActive = false;

   updateRollCounter();
   displayDice();
}

function lockGameBoard() {
    const rollButton = document.getElementById("rollButton");
    if (rollButton) {
        rollButton.disabled = true;
        rollButton.classList.add("disabled");
    }

    const diceElements = document.querySelectorAll(".die");
    diceElements.forEach((die) => {
        die.classList.remove("held", "selected");
    });
}

// --- INFINITE MODE LOGIC ---

function startInfiniteChallenge() {
    isInfiniteMode = true;

    const puzzleNumEl = document.getElementById("puzzleNumber");
    if (puzzleNumEl) puzzleNumEl.textContent = "Infinite";

    const shareModal = document.getElementById("shareModal");
    const resultBox = document.getElementById("resultBox");
    const viewResultsBtn = document.getElementById("viewResultsBtn");

    if (shareModal) shareModal.classList.add("hidden");
    if (resultBox) {
        resultBox.classList.add("hidden");
        resultBox.className = "hidden";
    }
    if (viewResultsBtn) viewResultsBtn.classList.add("hidden");

    const rollButton = document.getElementById("rollButton");
    if (rollButton) {
        rollButton.disabled = false;
        rollButton.classList.remove("disabled");
    }

    totalScore = 0;
    yachtScored = false;
    rollsRemaining = 3;
    dice = [0, 0, 0, 0, 0];
    held = [false, false, false, false, false];

    generateInfiniteChallenge();
    updateRollCounter();
    updateTotalScore();
    displayDice();
    displayScorecard();
}

function pickWeightedCategoryInfinite(pool) {
    let totalWeight = 0;
    for (let category of pool) {
        totalWeight += category.weight;
    }
   
    let roll = Math.random() * totalWeight;
   
    for (let i = 0; i < pool.length; i++) {
        roll -= pool[i].weight;
        if (roll <= 0) {
            return pool.splice(i, 1)[0];
        }
    }
   
    return pool.pop();
}

function generateInfiniteChallenge() {
    scorecard = [];
    let pool = [...categories];
    let eliteCount = 0;
    const eliteCategories = ["Yacht", "Large Straight", "Four of a Kind"];

    while (scorecard.length < 3) {
        const chosen = pickWeightedCategoryInfinite(pool);
        const isElite = eliteCategories.includes(chosen.name);

        if (isElite && eliteCount >= 2) {
            pool.push(chosen);
            continue;
        }

        if (isElite) eliteCount++;

        scorecard.push({
            category: chosen.name,
            score: null,
            filled: false
        });
    }

    // --- OG GAME BALANCE MATH ---
    let selectedCategories = scorecard.map(row => row.category);
    let possibleScores = getPossibleTotalScores(selectedCategories).filter(score => score > 0);

    let highestPossible = Math.max(...possibleScores);
    possibleScores = possibleScores.filter(score => score >= highestPossible * 0.27);
    possibleScores.sort((a, b) => a - b);

    let weightedScores = [];
    for (let score of possibleScores) {
        let weight = Math.max(1, possibleScores.length - possibleScores.indexOf(score));
        for (let i = 0; i < weight; i++) {
            weightedScores.push(score);
        }
    }

    let randomIndex = Math.floor(Math.random() * weightedScores.length);
    targetScore = weightedScores[randomIndex];

    const targetScoreEl = document.getElementById("targetScore");
    if (targetScoreEl) {
        targetScoreEl.textContent = "Goal: " + targetScore + "+";
    }
}

function returnToDailyMode() {
    if (!isInfiniteMode) return;
   
    isInfiniteMode = false;
    setDailyPuzzleNumber();
   
    const resultBox = document.getElementById("resultBox");
    if (resultBox) resultBox.classList.add("hidden");

    const isAlreadyCompleted = loadDailyState();

    if (isAlreadyCompleted) {
        updateTotalScore();
        displayScorecard();
    } else {
        generateDailyChallenge();
        resetTurn();
        updateTotalScore();
        displayScorecard();
    }
}

function checkGameEnd() {
    const isFinished = scorecard.length > 0 && scorecard.every(row => row.filled || row.scored || row.score !== null);

    if (isFinished) {
        if (!isInfiniteMode && typeof saveCompletedState === "function") {
            saveCompletedState();
        }

        if (!isInfiniteMode && typeof gtag === "function") {
            gtag('event', 'challenge_complete', {
                challenge_date: new Date().toISOString().split('T')[0],
                score: totalScore,
                won: totalScore >= targetScore
            });
        }

        lockGameBoard();
        triggerGameCompletionSequence();
    }
}

function triggerGameCompletionSequence() {
    const resultBox = document.getElementById("resultBox") ||
                      document.getElementById("resultsModal") ||
                      document.getElementById("victoryModal") ||
                      document.getElementById("gameCompleteModal");

    if (resultBox) {
        resultBox.classList.remove("hidden");
        resultBox.classList.add("active", "show");

        if (totalScore >= targetScore) {
            resultBox.className = "win active";
            resultBox.innerHTML = `🎉 ${totalScore} 🎉`;
        } else {
            resultBox.className = "lose active";
            resultBox.innerHTML = `❌ ${totalScore} ❌`;
        }
    }

    if (totalScore >= targetScore) {
        if (typeof launchConfetti === "function") {
            launchConfetti();
        }
    }

    if (!isInfiniteMode) {
        setTimeout(() => {
            triggerSharePopup(true);
        }, 1500);
    }
}

function triggerSharePopup(instant = false) {
    const showModal = () => {
        const shareModal = document.getElementById("shareModal");
        const shareSummaryText = document.getElementById("shareSummaryText");
        const modalTitle = shareModal?.querySelector("h2, h3, .modal-title");
       
        if (shareSummaryText) {
            const puzzleNum = document.getElementById("puzzleNumber")?.textContent || "#1";
            const hasWon = totalScore >= targetScore;
            const statusEmoji = hasWon ? "🎉" : "❌";

            if (modalTitle) {
                modalTitle.textContent = hasWon ? "Congratulations!" : "Too Bad...";
            }

            const emojiGrid = generateEmojiSummary();
            shareSummaryText.textContent = `Yachtle ${puzzleNum}\n${statusEmoji}${totalScore}${statusEmoji}\n\n${emojiGrid}`;
        }
       
        if (shareModal) {
            shareModal.classList.remove("hidden");
            shareModal.classList.add("active");
        }
    };

    if (instant) {
        showModal();
    } else {
        setTimeout(showModal, 1500);
    }
}

function generateEmojiSummary() {
    if (!Array.isArray(scorecard)) return "";

    return scorecard.map(row => {
        const categoryName = row.category;
        const catKey = categoryName.toLowerCase();
        const score = typeof row.score === "number" ? row.score : 0;
        const maxPossible = MAX_SCORES[catKey] || 30;

        let emoji = "dt";
        if (score === 50 || catKey === "yacht") {
            emoji = score === 50 ? "🛥️" : (score > 0 ? "🟩" : "🟥");
        } else if (score >= maxPossible && score > 0) {
            emoji = "🟩";
        } else if (score > 0) {
            emoji = "🟨";
        } else {
            emoji = "🟥";
        }

        return `${emoji} ${categoryName}`;
    }).join("\n");
}

function launchConfetti() {
    const container = document.getElementById("confettiContainer") || document.body;
    const resultBox = document.getElementById("resultBox") ||
                      document.getElementById("resultsModal") ||
                      document.getElementById("victoryModal") ||
                      document.getElementById("gameCompleteModal");

    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (resultBox) {
        const rect = resultBox.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
    }

    const colors = ["#ff4d4d", "#4da6ff", "#ffd633", "#66cc66", "#cc66ff", "#ff66b3"];

    for (let i = 0; i < 60; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti";
        piece.style.position = "fixed";
        piece.style.left = startX + "px";
        piece.style.top = startY + "px";

        const x = (Math.random() - 0.5) * 500;
        const y = (Math.random() - 0.5) * 500;

        piece.style.setProperty("--x", x + "px");
        piece.style.setProperty("--y", y + "px");
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = Math.random() * 6 + 5 + "px";
        piece.style.height = Math.random() * 12 + 8 + "px";
        piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";

        container.appendChild(piece);
        setTimeout(() => piece.remove(), 1500);
    }
}

function copyShareScore() {
    const shareSummaryText = document.getElementById("shareSummaryText");
    if (!shareSummaryText) return;

    const shareText = `${shareSummaryText.textContent}\nhttp://yachtlegame.com/`;

    navigator.clipboard.writeText(shareText).then(() => {
        if (typeof gtag === "function") {
            gtag('event', 'score_copied', {
                challenge_date: new Date().toISOString().split('T')[0]
            });
        }

        const shareBtn = document.getElementById("shareScoreBtn");
        if (shareBtn) {
            shareBtn.textContent = "Copied to Clipboard!";
            setTimeout(() => {
                shareBtn.textContent = "Share Score 📋";
            }, 2000);
        }
    });
}

function setDailyPuzzleNumber() {
    const startDate = new Date(2026, 7, 1);
    const today = new Date();

    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = todayMidnight - startMidnight;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const puzzleNumEl = document.getElementById("puzzleNumber");
    if (puzzleNumEl) {
        puzzleNumEl.textContent = `#${diffDays}`;
    }
    return diffDays;
}

function updateIcons() {
    const isDark = document.body.classList.contains("dark-mode");
   
    const rulesIcon = document.getElementById("rulesIcon");
    if (rulesIcon) {
        rulesIcon.src = isDark ? "assets/questionwhite.svg" : "assets/questionblack.svg";
    }

    const infiniteIcon = document.getElementById("infiniteIcon");
    if (infiniteIcon) {
        infiniteIcon.src = isDark ? "assets/infinitelight.svg" : "assets/infinitedark.svg";
    }

    const themeToggleIcon = document.getElementById("themeToggleIcon");
    if (themeToggleIcon) {
        themeToggleIcon.src = isDark ? "assets/light.svg" : "assets/dark.svg";
    }
}

function toggleNightMode() {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    updateIcons();
}

// --- INITIALIZATION ---

document.addEventListener("DOMContentLoaded", function () {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    }
    updateIcons();

    setDailyPuzzleNumber();

    const isAlreadyCompletedOrActive = loadDailyState();

    if (!isAlreadyCompletedOrActive) {
        generateDailyChallenge();
        updateRollCounter();
        displayDice();
        displayScorecard();
        updateTotalScore();
    }

    const rollBtn = document.getElementById("rollButton");
    if (rollBtn) {
        rollBtn.addEventListener("click", rollDice);
    }

    const gameHeader = document.querySelector("h1") || document.getElementById("gameHeader");
    if (gameHeader) {
        gameHeader.style.cursor = "pointer";
    }

    const shareModal = document.getElementById("shareModal");
    const rulesModal = document.getElementById("rulesModal");
    const completionModal = document.getElementById("completionModal");
    const viewResultsBtn = document.getElementById("viewResultsBtn");

    document.addEventListener("click", function (e) {
        if (
            e.target.closest("#infiniteToggle") ||
            e.target.closest("#playInfiniteBtn") ||
            e.target.closest("#infiniteIcon")
        ) {
            if (completionModal) completionModal.classList.add("hidden");
            startInfiniteChallenge();
            return;
        }

        if (e.target.closest("h1") || e.target.closest("#gameHeader")) {
            returnToDailyMode();
            return;
        }

        if (e.target.closest("#closeShare")) {
            if (shareModal) shareModal.classList.add("hidden");
            if (viewResultsBtn) {
                viewResultsBtn.classList.remove("hidden");
                viewResultsBtn.style.display = "block";
                viewResultsBtn.style.margin = "16px auto";
            }
        }

        if (e.target.closest("#closeRules")) {
            if (rulesModal) rulesModal.classList.add("hidden");
        }

        if (e.target.closest("#closeCompletion")) {
            if (completionModal) completionModal.classList.add("hidden");
        }

        if (e.target.closest("#rulesToggle")) {
            if (rulesModal) rulesModal.classList.remove("hidden");
        }

        if (e.target.closest("#viewResultsBtn")) {
            if (shareModal) shareModal.classList.remove("hidden");
        }

        if (e.target.closest("#shareScoreBtn")) {
            copyShareScore();
        }

        if (e.target === shareModal) {
            if (shareModal) shareModal.classList.add("hidden");
            if (viewResultsBtn) viewResultsBtn.classList.remove("hidden");
        }

        if (e.target === rulesModal) {
            if (rulesModal) rulesModal.classList.add("hidden");
        }

        if (e.target === completionModal) {
            if (completionModal) completionModal.classList.add("hidden");
        }
    });
});

function generateBalancedTargetScore(scorecardRows) {
    let selectedCategories = scorecardRows.map(row => row.category);
    let possibleScores = getPossibleTotalScores(selectedCategories).filter(score => score > 0);

    let highestPossible = Math.max(...possibleScores);
    possibleScores = possibleScores.filter(score => score >= highestPossible * 0.27);
    possibleScores.sort((a, b) => a - b);

    let weightedScores = [];
    for (let score of possibleScores) {
        let weight = Math.max(1, possibleScores.length - possibleScores.indexOf(score));
        for (let i = 0; i < weight; i++) {
            weightedScores.push(score);
        }
    }

    let randomIndex = Math.floor(Math.random() * weightedScores.length);
    return weightedScores[randomIndex];
}