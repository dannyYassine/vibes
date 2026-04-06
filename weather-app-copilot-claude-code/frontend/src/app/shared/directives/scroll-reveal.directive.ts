import { Directive, ElementRef, inject, OnInit, input } from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit {
  delay = input(0, { alias: 'appScrollRevealDelay' });

  private readonly el = inject(ElementRef);

  ngOnInit(): void {
    const element = this.el.nativeElement as HTMLElement;
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = `opacity 0.4s ease ${this.delay()}ms, transform 0.4s ease ${this.delay()}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
            observer.unobserve(element);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
  }
}
