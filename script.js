document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let allQuestions = []; // Stores all questions from JSON
    let questionsBySection = {}; // Groups questions by section name
    let currentSectionName = ''; // Tracks the currently active section
    let questionsForCurrentSection = []; // Holds the questions for the active section
    let currentQuestionIndex = 0; // Index within the *current section's* array
    
    const totalTime = 2 * 60 * 60; // 2 hours in seconds
    let timeLeft = totalTime;
    let timerInterval;
    let isReviewMode = false;

    // --- DOM ELEMENTS ---
    const sectionTabsContainerEl = document.querySelector('.nav-tabs');
    const questionNumberEl = document.getElementById('question-number');
    const questionTextEl = document.getElementById('question-text');
    const optionsContainerEl = document.getElementById('options-container');
    const questionPaletteEl = document.getElementById('question-palette');
    const saveNextBtn = document.getElementById('save-next-btn');
    const clearResponseBtn = document.getElementById('clear-response-btn');
    const markReviewBtn = document.getElementById('mark-review-btn');
    const submitTestBtn = document.getElementById('submit-test-btn');
    const resultSummaryEl = document.getElementById('result-summary');
    const testNavigationBtnsEl = document.getElementById('test-navigation-btns');
    const sectionTitleTextEl = document.getElementById('section-title-text');

    // --- INITIALIZATION ---
    async function initializeTest() {
        await fetchAndGroupQuestions();
        setupDynamicUI();
        startTimer();
    }

    // --- DATA HANDLING ---
    async function fetchAndGroupQuestions() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) throw new Error('Network response was not ok');
            allQuestions = await response.json();
            
            questionsBySection = {}; // Reset
            allQuestions.forEach(q => {
                q.status = 'not-visited';
                q.userAnswer = null;

                if (!questionsBySection[q.section]) {
                    questionsBySection[q.section] = [];
                }
                questionsBySection[q.section].push(q);
            });
        } catch (error) {
            console.error('Failed to fetch questions:', error);
            questionTextEl.innerHTML = 'Failed to load questions. Please check the `questions.json` file and refresh the page.';
        }
    }

    // --- UI SETUP ---
    function setupDynamicUI() {
        const sectionNames = Object.keys(questionsBySection);

        if (sectionNames.length === 0) {
            questionTextEl.innerHTML = "No questions found. Please check your `questions.json` file.";
            return;
        }

        // 1. Render Tabs Dynamically
        sectionTabsContainerEl.innerHTML = ''; // Clear any static tabs from HTML
        sectionNames.forEach(name => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            const a = document.createElement('a');
            a.className = 'nav-link';
            a.href = '#';
            a.dataset.section = name;
            a.textContent = name;
            li.appendChild(a);
            sectionTabsContainerEl.appendChild(li);
        });

        // 2. Add event listeners to newly created tabs
        const sectionTabs = sectionTabsContainerEl.querySelectorAll('.nav-link');
        sectionTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionName = e.target.getAttribute('data-section');
                if (sectionName !== currentSectionName) {
                    switchSection(sectionName);
                }
            });
        });

        // 3. Switch to the first section to start the test
        switchSection(sectionNames[0]);
    }

    // --- CORE LOGIC: SECTION SWITCHING ---
    function switchSection(sectionName) {
        if (!questionsBySection[sectionName]) return;

        currentSectionName = sectionName;
        questionsForCurrentSection = questionsBySection[sectionName];
        currentQuestionIndex = 0;

        // Update UI
        sectionTitleTextEl.textContent = `Section: ${sectionName}`;
        sectionTabsContainerEl.querySelectorAll('.nav-link').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-section') === sectionName);
        });
        
        renderQuestionPalette();

        if (isReviewMode) {
            updatePaletteForReview();
            displayQuestionInReview(0);
        } else {
            displayQuestion(0);
        }
    }

    // --- UI RENDERING ---
    function renderQuestionPalette() {
        questionPaletteEl.innerHTML = '';
        questionsForCurrentSection.forEach((q, index) => {
            const button = document.createElement('button');
            button.className = 'palette-button';
            button.textContent = index + 1;
            button.dataset.index = index;
            button.addEventListener('click', () => {
                const newIndex = parseInt(button.dataset.index, 10);
                if (isReviewMode) {
                    displayQuestionInReview(newIndex);
                } else {
                    displayQuestion(newIndex);
                }
            });
            questionPaletteEl.appendChild(button);
        });
    }
    
    function displayQuestion(index) {
        if (index < 0 || index >= questionsForCurrentSection.length) return;
        
        const currentQuestion = questionsForCurrentSection[currentQuestionIndex];
        if (currentQuestion.status === 'not-visited') currentQuestion.status = 'not-answered';
        
        currentQuestionIndex = index;
        const question = questionsForCurrentSection[currentQuestionIndex];
        if (question.status === 'not-visited') question.status = 'not-answered';
        
        questionNumberEl.textContent = `No. ${question.id}`;
        questionTextEl.innerHTML = question.question;
        optionsContainerEl.innerHTML = '';
        
        question.options.forEach((option, i) => {
            const optionId = `q${question.id}-option${i}`;
            const isChecked = question.userAnswer === i;
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.innerHTML = `<input type="radio" id="${optionId}" name="question${question.id}" value="${i}" ${isChecked ? 'checked' : ''}><label for="${optionId}">${option}</label>`;
            optionsContainerEl.appendChild(optionDiv);
            optionDiv.querySelector('input').addEventListener('change', saveAnswer);
        });
        
        updatePalette();
    }
    
    function displayQuestionInReview(index) {
        currentQuestionIndex = index;
        const question = questionsForCurrentSection[currentQuestionIndex];
        questionNumberEl.textContent = `No. ${question.id}`;
        questionTextEl.innerHTML = question.question;
        optionsContainerEl.innerHTML = '';
        
        question.options.forEach((option, i) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            const isCorrect = i === (question.correct_option - 1);
            const isUserAnswer = i === question.userAnswer;
            
            if (isCorrect) optionDiv.classList.add('correct-answer');
            else if (isUserAnswer && !isCorrect) optionDiv.classList.add('user-answer-wrong');
            
            optionDiv.innerHTML = `<input type="radio" disabled ${isUserAnswer ? 'checked' : ''}><label>${option}</label>`;
            optionsContainerEl.appendChild(optionDiv);
        });
        
        updatePalette();
    }

    function updatePalette() {
        const buttons = questionPaletteEl.querySelectorAll('.palette-button');
        if (!isReviewMode) {
            buttons.forEach((button, index) => {
                const question = questionsForCurrentSection[index];
                button.className = 'palette-button';
                button.classList.add(question.status);
            });
        }
        
        buttons.forEach(button => button.classList.remove('active'));
        if (buttons[currentQuestionIndex]) {
            buttons[currentQuestionIndex].classList.add('active');
        }
    }
    
    function updatePaletteForReview() {
        const buttons = questionPaletteEl.querySelectorAll('.palette-button');
        buttons.forEach((button, index) => {
            const question = questionsForCurrentSection[index];
            button.className = 'palette-button';
            if (question.userAnswer === null) button.classList.add('unattempted');
            else if (question.userAnswer === (question.correct_option - 1)) button.classList.add('correct');
            else button.classList.add('incorrect');
        });
    }

    // --- TIMER LOGIC (Unchanged) ---
    function startTimer() {
        if (timerInterval) return; // Prevent multiple timers
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        timerInterval = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                alert("Time's up! The test will be submitted automatically.");
                submitTest();
                return;
            }
            timeLeft--;
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;
            hoursEl.textContent = String(hours).padStart(2, '0');
            minutesEl.textContent = String(minutes).padStart(2, '0');
            secondsEl.textContent = String(seconds).padStart(2, '0');
        }, 1000);
    }

    // --- ACTION HANDLERS ---
    function saveAnswer() {
        if (isReviewMode) return;
        const question = questionsForCurrentSection[currentQuestionIndex];
        const selectedOption = optionsContainerEl.querySelector(`input[name="question${question.id}"]:checked`);
        if (selectedOption) {
            question.userAnswer = parseInt(selectedOption.value);
            if (question.status !== 'marked-answered') {
                question.status = 'answered';
            }
        }
        updatePalette();
    }

    function goToNextQuestion() {
        if (currentQuestionIndex < questionsForCurrentSection.length - 1) {
            displayQuestion(currentQuestionIndex + 1);
        } else {
            alert(`You have reached the last question of the ${currentSectionName} section.`);
        }
    }

    saveNextBtn.addEventListener('click', () => { saveAnswer(); goToNextQuestion(); });
    clearResponseBtn.addEventListener('click', () => {
        if (isReviewMode) return;
        const question = questionsForCurrentSection[currentQuestionIndex];
        const selectedOption = optionsContainerEl.querySelector(`input[name="question${question.id}"]:checked`);
        if (selectedOption) selectedOption.checked = false;
        question.userAnswer = null;
        question.status = 'not-answered';
        updatePalette();
    });
    markReviewBtn.addEventListener('click', () => {
        saveAnswer();
        const question = questionsForCurrentSection[currentQuestionIndex];
        question.status = question.userAnswer !== null ? 'marked-answered' : 'marked';
        goToNextQuestion();
    });
    submitTestBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to submit the test?')) {
            submitTest();
        }
    });
    
    function submitTest() {
        isReviewMode = true;
        clearInterval(timerInterval);

        let score = 0, attempted = 0, correct = 0, incorrect = 0;
        allQuestions.forEach(q => {
            if (q.userAnswer !== null) {
                attempted++;
                if (q.userAnswer === (q.correct_option - 1)) {
                    score++;
                    correct++;
                } else {
                    incorrect++;
                }
            }
        });
        
        testNavigationBtnsEl.classList.add('d-none');
        submitTestBtn.disabled = true;
        submitTestBtn.textContent = 'Test Submitted';

        resultSummaryEl.classList.remove('d-none');
        resultSummaryEl.innerHTML = `
            <div class="alert alert-info text-center">
                <h4 class="alert-heading">Test Complete!</h4>
                <p>Your Overall Score: <strong>${score} / ${allQuestions.length}</strong></p>
                <hr>
                <p class="mb-0">
                    Correct: <span class="badge bg-success">${correct}</span> | 
                    Incorrect: <span class="badge bg-danger">${incorrect}</span> | 
                    Unattempted: <span class="badge bg-warning text-dark">${allQuestions.length - attempted}</span>
                </p>
                <p class="mt-2">You can now review your answers by section.</p>
            </div>
        `;
        
        const firstSection = Object.keys(questionsBySection)[0];
        switchSection(firstSection);
    }

    // --- KICK IT OFF ---
    initializeTest();
});