document.getElementById('settings-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const jsonInput = document.getElementById('json-input').value;
    const negativeMarking = document.getElementById('negative-marking').value;
    const totalTime = document.getElementById('total-time').value;
    const timePerQuestion = document.getElementById('time-per-question').value;

    try {
        const questions = JSON.parse(jsonInput);
        localStorage.setItem('quizQuestions', JSON.stringify(questions));
        localStorage.setItem('quizSettings', JSON.stringify({
            negativeMarking,
            totalTime,
            timePerQuestion
        }));
        window.location.href = 'quiz.html';
    } catch (error) {
        alert('Invalid JSON format! Please check your JSON and try again.');
    }
});
