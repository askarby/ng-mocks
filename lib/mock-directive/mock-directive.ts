import {
  Directive, ElementRef, EventEmitter, forwardRef, Inject, OnChanges, Optional, TemplateRef, Type, ViewContainerRef
} from '@angular/core';
import { MockOf } from '../common';
import { directiveResolver } from '../common/reflect';

const cache = new Map<Type<Directive>, Type<Directive>>();

export function MockDirectives(...directives: Array<Type<any>>): Array<Type<any>> {
  return directives.map(MockDirective);
}

export function MockDirective<TDirective>(directive: Type<TDirective>): Type<TDirective> {
  const cacheHit = cache.get(directive);
  if (cacheHit) {
    return cacheHit as Type<TDirective>;
  }

  const { selector, exportAs, inputs, outputs } = directiveResolver.resolve(directive);

  // tslint:disable:no-unnecessary-class
  @MockOf(directive)
  @Directive({
    exportAs,
    inputs,
    outputs,
    providers: [{
      provide: directive,
      useExisting: forwardRef(() => DirectiveMock)
    }],
    selector
  })
  class DirectiveMock implements OnChanges {
    private structural = false;

    constructor(private hostElement: ElementRef,
                @Optional() @Inject(TemplateRef) templateRef?: TemplateRef<any>,
                @Optional() @Inject(ViewContainerRef) viewContainer?: ViewContainerRef) {

      Object.keys(directive.prototype).forEach((method) => {
        if (!(this as any)[method]) {
          (this as any)[method] = () => {};
        }
      });

      (outputs || []).forEach((output) => {
        (this as any)[output.split(':')[0]] = new EventEmitter<any>();
      });

      if (templateRef && viewContainer) {
        this.structural = true;
        viewContainer.createEmbeddedView(templateRef);
      }
    }

    ngOnChanges() {
      if (!this.structural) {
        return;
      }
      const inputValues = (inputs || []).reduce((acc, input) => acc[input] = (this as any)[input],
                                                {} as { [key: string]: any }); // tslint:disable-line
      const strippedSelector = (selector || '').replace(/^\[|\]$/g, '');
      this.hostElement.nativeElement.setAttribute(strippedSelector, JSON.stringify(inputValues));
    }
  }
  // tslint:enable:no-unnecessary-class

  cache.set(directive, DirectiveMock as any);

  return DirectiveMock as any;
}
