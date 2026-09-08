const form = document.getElementById('partnerForm');

form.addEventListener('submit', e => {
  e.preventDefault();

  const d = new FormData(form);

  const subject = `Sponsor Mohawk Partnership Inquiry — ${d.get('interest') || ''}`;

  const body = `Name: ${d.get('name') || ''}
Company: ${d.get('company') || ''}
Email: ${d.get('email') || ''}
Phone: ${d.get('phone') || ''}
Interest: ${d.get('interest') || ''}

Message:
${d.get('message') || ''}`;

  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: 'derekduzan@gmail.com',
    su: subject,
    body: body
  });

  document.getElementById('formNote').textContent = 'Opening Gmail...';

  window.open(
    `https://mail.google.com/mail/?${params.toString()}`,
    '_blank'
  );
});
