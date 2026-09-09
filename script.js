const form = document.getElementById('partnerForm');
const formNote = document.getElementById('formNote');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-NWAUyeFeJUi6gvFO1UiZpcBOOGo_jcoykXbTeYEvz0O69uZH0DQFts9SKbd3x40T/exec';

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const submitButton = form.querySelector('[type="submit"]');
  const originalText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';

  formNote.textContent = 'Sending your inquiry...';

  const formData = new FormData(form);

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData,
      mode: 'no-cors'
    });

    form.reset();

    formNote.textContent =
      'Thanks — your inquiry has been sent to Team Mohawk. We’ll be in touch.';

    submitButton.textContent = 'Sent';

    setTimeout(() => {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }, 3000);

  } catch (error) {
    console.error(error);

    formNote.textContent =
      'Something went wrong. Please try again.';

    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
});
