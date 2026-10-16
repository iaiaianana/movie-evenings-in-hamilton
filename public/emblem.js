(() => {
  if (!window.customElements || customElements.get('club-emblem')) return;
  const ns = 'http://www.w3.org/2000/svg';
  class ClubEmblem extends HTMLElement {
    connectedCallback() {
      if (this.cleanup) return;
      const image = this.querySelector('img');
      if (!image) return;
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 1575 999');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      const eyes = [[574, 354], [674, 456], [774, 561]].map(([x, y], index) => {
        const group = document.createElementNS(ns, 'g');
        // Restrict every animated pixel to a small patch around one shield eye.
        group.innerHTML = `<defs><clipPath id="club-eye-${index}"><ellipse cx="${x}" cy="${y}" rx="64" ry="51"/></clipPath></defs><g clip-path="url(#club-eye-${index})"><ellipse cx="${x}" cy="${y}" rx="64" ry="51" fill="#f1eee5"/><g class="eye-copy"><g clip-path="url(#club-eye-${index})"><image x="0" y="0" width="1575" height="999"/></g></g><path class="closed-lid" d="M ${x-55} ${y+6} Q ${x} ${y+18} ${x+55} ${y+6}" fill="none" stroke="#263b32" stroke-width="3" stroke-linecap="round"/></g>`;
        group.querySelector('image').setAttribute('href', image.getAttribute('src'));
        group.style.visibility = 'hidden';
        svg.append(group);
        return {group, copy:group.querySelector('.eye-copy'), lid:group.querySelector('.closed-lid'), x, y, timer:null, frame:null};
      });
      this.append(svg);
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let active = false;
      const clear = () => eyes.forEach(eye => {
        clearTimeout(eye.timer); cancelAnimationFrame(eye.frame);
        eye.timer = eye.frame = null; eye.group.style.visibility = 'hidden';
      });
      const schedule = eye => {
        if (!active) return;
        eye.timer = setTimeout(() => {
          if (!active) return;
          const start = performance.now();
          const tick = now => {
            if (!active) return;
            const progress = Math.min(1, (now-start)/180);
            const scale = Math.abs(1-2*progress);
            eye.group.style.visibility = 'visible';
            eye.copy.setAttribute('transform', `translate(0 ${eye.y}) scale(1 ${Math.max(.001,scale)}) translate(0 ${-eye.y})`);
            eye.lid.style.opacity = String(1-scale);
            if (progress < 1) eye.frame = requestAnimationFrame(tick);
            else { eye.group.style.visibility = 'hidden'; eye.frame=null; schedule(eye); }
          };
          eye.frame = requestAnimationFrame(tick);
        }, 12000 + Math.random()*6000);
      };
      const update = () => {
        clear(); active = !document.hidden && !motion.matches;
        if (active) eyes.forEach(schedule);
      };
      document.addEventListener('visibilitychange', update);
      motion.addEventListener('change', update);
      this.cleanup = () => {
        active=false; clear(); svg.remove();
        document.removeEventListener('visibilitychange', update);
        motion.removeEventListener('change', update);
      };
      update();
    }
    disconnectedCallback() { this.cleanup?.(); this.cleanup=null; }
  }
  customElements.define('club-emblem', ClubEmblem);
})();
