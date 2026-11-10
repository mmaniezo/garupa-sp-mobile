import { StyleSheet, View } from 'react-native';

import { alerta, brand, raio, tons } from '@/theme';

import { Icone, type NomeIcone } from './icone';
import { Texto } from './texto';

type Tom = 'info' | 'erro' | 'neutro' | 'sucesso';

const tons_: Record<Tom, { fundo: string; icone: string; nome: NomeIcone }> = {
  info: { fundo: tons.informacaoFundo, icone: tons.informacaoIcone, nome: 'info' },
  erro: { fundo: tons.emergenciaEscura, icone: tons.emergenciaTexto, nome: 'alerta' },
  neutro: { fundo: tons.superficie, icone: tons.textoSecundario, nome: 'info' },
  sucesso: { fundo: '#12301F', icone: tons.seguroClaro, nome: 'check' },
};

type Props = { texto: string; titulo?: string; tom?: Tom; anunciar?: boolean };

/** Caixa de aviso em linha (erro de envio, sem internet, dica). Sempre ícone + texto, nunca só cor. */
export function Aviso({ texto, titulo, tom = 'neutro', anunciar }: Props) {
  const t = tons_[tom];
  return (
    <View
      style={[styles.caixa, { backgroundColor: t.fundo, borderColor: tom === 'erro' ? alerta.emergencia : 'transparent' }]}
      accessibilityRole={anunciar ? 'alert' : undefined}
      accessibilityLiveRegion={anunciar ? 'polite' : undefined}>
      <Icone nome={t.nome} tamanho={20} cor={t.icone} />
      <View style={styles.textos}>
        {titulo ? (
          <Texto variante="rotulo" cor={brand.branco}>
            {titulo}
          </Texto>
        ) : null}
        <Texto variante="legenda" cor={brand.branco}>
          {texto}
        </Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: raio.lg, borderWidth: 1, alignItems: 'flex-start' },
  textos: { flex: 1, gap: 2 },
});
