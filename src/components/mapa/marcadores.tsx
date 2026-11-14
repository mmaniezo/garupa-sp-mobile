import { StyleSheet, View } from 'react-native';

import { Icone, Texto } from '@/components/ui';
import { alerta, brand } from '@/theme';

/** O marcador do design: círculo âmbar com o número do ponto na lista. */
export function MarcadorNumero({ numero, selecionado }: { numero: number; selecionado: boolean }) {
  return (
    <View style={[styles.marcador, selecionado && styles.marcadorSel]}>
      <Texto variante="overline" cor={brand.asfalto} style={{ letterSpacing: 0 }}>
        {numero}
      </Texto>
    </View>
  );
}

/** Perigo relatado: triângulo âmbar num círculo escuro, para não confundir com os pontos do modelo. */
export function MarcadorRelato() {
  return (
    <View style={styles.relato}>
      <Icone nome="alerta" tamanho={16} cor={alerta.atencao} espessura={2.6} />
    </View>
  );
}

const styles = StyleSheet.create({
  marcador: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: alerta.atencao,
    borderWidth: 3,
    borderColor: brand.asfalto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorSel: { width: 36, height: 36, borderRadius: 18, borderColor: brand.branco },
  relato: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: brand.asfalto,
    borderWidth: 2,
    borderColor: alerta.atencao,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
