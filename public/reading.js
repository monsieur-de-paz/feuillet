document.querySelectorAll('form.quiz').forEach(form=>{
  form.addEventListener('reset',()=>{form.querySelectorAll('.quiz-feedback,.quiz-score').forEach(el=>{el.textContent='';el.classList.remove('correct','incorrect');});});
  form.addEventListener('submit',async event=>{
    event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;
    const answers={};form.querySelectorAll('fieldset').forEach(field=>{answers[field.dataset.question]=field.dataset.type==='short'?field.querySelector('input').value:[...field.querySelectorAll('input:checked')].map(el=>Number(el.value));});
    try{
      const session=await fetch('api.php?action=session').then(r=>r.json());
      const response=await fetch('api.php?action=quiz',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify({page_id:form.dataset.page,quiz_id:form.dataset.quiz,answers})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Correction indisponible.');
      form.querySelector('.quiz-score').textContent=`Résultat : ${result.score} / ${result.total}`;
      result.results.forEach(q=>{const field=[...form.querySelectorAll('fieldset')].find(el=>el.dataset.question===q.id);if(!field)return;const feedback=field.querySelector('.quiz-feedback');feedback.className='quiz-feedback '+(q.correct?'correct':'incorrect');feedback.textContent=(q.correct?'✓ Bonne réponse. ':'↻ À revoir. Réponse attendue : '+q.expected.join(', ')+'. ')+q.explanation;});
    }catch(error){form.querySelector('.quiz-score').textContent=error.message;}finally{button.disabled=false;}
  });
});
