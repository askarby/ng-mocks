import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule, Provider, Type } from '@angular/core';
import { ngModuleResolver } from '../common/reflect';
import { MockDeclaration } from '../mock-declaration';

interface IModuleOptions {
  declarations: Array<Type<any>>;
  exports: Array<Type<any>>;
  imports: Array<Type<any>>;
  providers: Array<{ provide: any; useValue: {} }>;
}

const mockProvider = (provider: any) => ({
  provide: provider, useValue: {}
});

const flatten = <T>(values: T | T[], result: T[] = []): T[] => {
    if (Array.isArray(values)) {
        values.forEach((value: T | T[]) => flatten(value, result));
    } else {
        result.push(values);
    }
    return result;
};

const isModuleWithProviders = (object: any): object is ModuleWithProviders => typeof object.ngModule !== 'undefined';

export function MockModule(module: Type<NgModule> | ModuleWithProviders): Type<NgModule> {
  return NgModule(MockIt(module))(class MockedModule {});
}

const NEVER_MOCK: Array<Type<NgModule>> = [CommonModule];

function MockIt(module: Type<NgModule> | ModuleWithProviders): IModuleOptions {
  let ngModule: Type<NgModule>;
  let ngModuleProviders: Provider[] = [];

  // Disassembling module.
  if (isModuleWithProviders(module)) {
    ngModule = module.ngModule;
    if (module.providers) {
      ngModuleProviders = flatten(module.providers);
    }
  } else {
    ngModule = module;
  }

  if (NEVER_MOCK.includes(ngModule)) {
    return ngModule as any;
  }
  const mockedModule: IModuleOptions = { declarations: [],
                                         exports: [],
                                         imports: [],
                                         providers: [] };
  const { declarations = [], imports = [], providers = [] } = ngModuleResolver.resolve(ngModule);

  mockedModule.exports = mockedModule.declarations = flatten(declarations).map(MockDeclaration);
  mockedModule.providers = ngModuleProviders.concat(...flatten(providers)).map(mockProvider);

  flatten(imports).forEach((imPort: Type<NgModule>) => {
    const result = MockIt(imPort);
    if ((result as any) === imPort) {
      mockedModule.imports.push(imPort);
    } else {
      mockedModule.declarations.push(...result.declarations);
      mockedModule.providers.push(...result.providers);
      mockedModule.exports.push(...result.declarations);
    }
  });

  return mockedModule;
}
