var e={bodyType:`male`,ageBracket:`teenager`,weightKg:void 0,heightCm:void 0};document.querySelectorAll(`.dropdown`).forEach(t=>{let n=t.getAttribute(`data-dropdown`),r=t.querySelector(`.pill`),i=t.querySelector(`.menu`);r&&i&&(r.addEventListener(`click`,e=>{e.stopPropagation(),document.querySelectorAll(`.menu`).forEach(e=>{e!==i&&(e.hidden=!0)}),i.hidden=!i.hidden}),i.querySelectorAll(`button`).forEach(t=>{t.addEventListener(`click`,a=>{a.stopPropagation();let o=t.dataset.value;o&&(n===`bodyType`&&(e.bodyType=o),n===`age`&&(e.ageBracket=o),r.textContent=t.textContent,i.hidden=!0,u())})}))}),document.addEventListener(`click`,()=>{document.querySelectorAll(`.menu`).forEach(e=>e.hidden=!0)});var t=document.getElementById(`advanced-toggle`),n=document.getElementById(`advanced-panel`);t&&n&&t.addEventListener(`click`,()=>{let e=n.hidden;n.hidden=!e,t.textContent=e?`− Hide height & weight`:`+ Add height & weight`});var r=document.getElementById(`height-input`),i=document.getElementById(`weight-input`),a;function o(){clearTimeout(a),a=setTimeout(()=>{let t=parseFloat(r?.value??``),n=parseFloat(i?.value??``);e.heightCm=Number.isFinite(t)?t:void 0,e.weightKg=Number.isFinite(n)?n:void 0,u()},400)}r?.addEventListener(`input`,o),i?.addEventListener(`input`,o);var s=document.getElementById(`nutrient-list`),c=document.getElementById(`no-results`),l=document.getElementById(`nutrient-search`);async function u(){if(!s)return;let t=new URLSearchParams({bodyType:e.bodyType,ageBracket:e.ageBracket});e.weightKg!==void 0&&t.set(`weightKg`,String(e.weightKg)),e.heightCm!==void 0&&t.set(`heightCm`,String(e.heightCm)),s.innerHTML=`<li class="loading-row">Loading…</li>`;try{let e=await fetch(`/api/nutrients?${t.toString()}`);if(!e.ok){s.innerHTML=`<li class="loading-row">Couldn't load nutrients — try again.</li>`;return}p((await e.json()).filter(e=>e.ready)),b()}catch{s.innerHTML=`<li class="loading-row">Couldn't load nutrients — try again.</li>`}}function d(e){return!e||e.resolved==null?`—`:e.valueType===`range`&&e.max!=null?`${Number.isInteger(e.min)?e.min:e.min.toFixed(1)}–${Number.isInteger(e.max)?e.max:e.max.toFixed(1)} ${e.unit}`:e.resolved==null?`—`:`${Number.isInteger(e.resolved)?e.resolved:e.resolved.toFixed(1)} ${e.unit}`}var f=e=>`<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="${e?`#c6f432`:`#3a443e`}">
          <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6 5.9 21l1.5-6.8-5.2-4.7 6.9-.7z" />
        </svg>`;function p(e){if(s){if(s.innerHTML=``,e.length===0){s.innerHTML=`<li class="loading-row">No data for this selection yet.</li>`;return}e.forEach(e=>{let t=document.createElement(`li`);t.className=`nutrient-row`,t.dataset.name=e.name.toLowerCase();let n=e.bodyStore?`<p class="n-bodystore"><strong>Body should contain:</strong> ${d(e.bodyStore)}</p>`:``,r=e.points.map(e=>`<li>${e}</li>`).join(``);t.innerHTML=`
            <button class="row-main" type="button" data-toggle>
              <span class="n-name">${e.name}</span>
              <span class="n-value">${d(e.dailyIntake)}</span>
              <span class="n-stars"></span>
              <span class="n-arrow">›</span>
            </button>
            <div class="row-info" hidden>
              ${n}
              <ul class="n-points">${r}</ul>
              ${e.sources.length?`<button type="button" class="sources-btn">Sources</button>`:``}
            </div>
          `;let i=t.querySelector(`.n-stars`);i&&(i.innerHTML=f(!0).repeat(e.importance)+f(!1).repeat(5-e.importance),i.setAttribute(`aria-label`,`${e.importance} out of 5 importance`));let a=t.querySelector(`[data-toggle]`),o=t.querySelector(`.row-info`);a&&o&&a.addEventListener(`click`,()=>{let e=!o.hidden;o.hidden=e,t.classList.toggle(`open`,!e)}),t.querySelector(`.sources-btn`)?.addEventListener(`click`,t=>{t.stopPropagation(),v(e)}),s.appendChild(t)})}}var m=document.getElementById(`sources-modal`),h=document.getElementById(`modal-title`),g=document.getElementById(`modal-source-list`),_=document.getElementById(`modal-close`);function v(e){m&&h&&g&&(h.textContent=`${e.name} Sources`,g.innerHTML=e.sources.map(e=>e.sourceType===`food`?`
                <li class="modal-source-row">
                  <div class="modal-source-info">
                    <strong>${e.food.name}</strong>
                    <span class="modal-source-qty">${e.foodAmount}${e.foodUnit} → ${e.nutrientAmount}${e.nutrientUnit}</span>
                  </div>
                  <button type="button" class="recipes-btn" disabled title="Recipes page coming soon">Recipes</button>
                </li>
              `:`
              <li class="modal-source-row">
                <div class="modal-source-info">
                  <strong>${e.name}</strong>
                  ${e.description?`<span class="modal-source-desc">${e.description}</span>`:``}
                </div>
              </li>
            `).join(``),m.hidden=!1)}function y(){m&&(m.hidden=!0)}_?.addEventListener(`click`,y),m?.addEventListener(`click`,e=>{e.target===m&&y()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&m&&!m.hidden&&y()});function b(){if(!s||!l||!c)return;let e=l.value.trim().toLowerCase(),t=0;s.querySelectorAll(`.nutrient-row`).forEach(n=>{let r=(n.dataset.name??``).includes(e);n.hidden=!r,r&&t++}),c.hidden=t!==0||s.querySelector(`.loading-row`)!==null}l?.addEventListener(`input`,b),u();