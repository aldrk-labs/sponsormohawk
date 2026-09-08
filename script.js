const form=document.getElementById('partnerForm');
form.addEventListener('submit',e=>{
  e.preventDefault();
  const d=new FormData(form);
  const subject=encodeURIComponent(`Sponsor Mohawk Partnership Inquiry — ${d.get('interest')}`);
  const body=encodeURIComponent(`Name: ${d.get('name')}\nCompany: ${d.get('company')}\nEmail: ${d.get('email')}\nPhone: ${d.get('phone')}\nInterest: ${d.get('interest')}\n\nMessage:\n${d.get('message')}`);
  document.getElementById('formNote').textContent='Opening your email app…';
  window.location.href=`mailto:?subject=${subject}&body=${body}`;
});
