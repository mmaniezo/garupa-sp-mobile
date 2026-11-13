import { StyleSheet, View } from 'react-native';

import { useEstilos } from '@/lib/tema';
import { alerta, raio, type NomeTema, type Paleta } from '@/theme';

import { Icone, type NomeIcone } from './icone';
import { Texto } from './texto';

type Tom = 'info' | 'erro' | 'neutro' | 'sucesso';

function tonsDoTema(c: Paleta, tema: NomeTema): Record<Tom, { fundo: string; icone: string; nome: NomeIcone }> {
  return {
    info: { fundo: c.informacaoFundo, icone: c.informacaoIcone, nome: 'info' },
    erro: { fundo: c.emergenciaSuperficie, icone: c.emergenciaTexto, nome: 'alerta' },
    neutro: { fundo: c.superficie, icone: c.textoSecundario, nome: 'info' },
    sucesso: { fundo: tema === 'claro' ? '#E3F4E9' : '#12301F', icone: c.seguroTexto, nome: 'check' },
  };
}

type Props = { texto: string; titulo?: string; tom?: Tom; anunciar?: boolean };

/** Caixa de aviso em linha (erro de envio, sem internet, dica). Sempre ícone + texto, nunca só cor. */
export function Aviso({ texto, titulo, tom = 'neutro', anunciar }: Props) {
  const t = useEstilos(tonsDoTema)[tom];
  return (
    <View
      style={[styles.caixa, { backgroundColor: t.fundo, borderColor: tom === 'erro' ? alerta.emergencia : 'transparent' }]}
      accessibilityRole={anunciar ? 'alert' : undefined}
      accessibilityLiveRegion={anunciar ? 'polite' : undefined}>
      <Icone nome={t.nome} tamanho={20} cor={t.icone} />
      <View style={styles.textos}>
        {titulo ? <Texto variante="rotulo">{titulo}</Texto> : null}
        <Texto variante="legenda">{texto}</Texto>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: raio.lg, borderWidth: 1, alignItems: 'flex-start' },
  textos: { flex: 1, gap: 2 },
});
