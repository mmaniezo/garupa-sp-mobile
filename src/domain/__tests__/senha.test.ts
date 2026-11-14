import { problemaDaSenha } from '../senha';

describe('senha de acesso', () => {
  it('aceita de 8 a 64 caracteres com letra e número', () => {
    expect(problemaDaSenha('garupa123')).toBeNull();
    expect(problemaDaSenha('Motoca2026!')).toBeNull();
    expect(problemaDaSenha('ção12345')).toBeNull();
  });

  it('recusa curta, longa, só letras ou só números', () => {
    expect(problemaDaSenha('abc123')).toMatch(/8 caracteres/);
    expect(problemaDaSenha(`a1${'x'.repeat(63)}`)).toMatch(/64/);
    expect(problemaDaSenha('garupasp')).toMatch(/letras e números/);
    expect(problemaDaSenha('12345678')).toMatch(/letras e números/);
  });
});
