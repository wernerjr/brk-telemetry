import { Dimensions } from 'react-native';

/**
 * Utilitário para detectar e gerenciar a orientação da tela
 * No futuro, podemos integrar com uma biblioteca como 'react-native-orientation-locker'
 */
export const OrientationUtil = {
  /**
   * Verifica se a tela está em modo paisagem (landscape)
   */
  isLandscape: (): boolean => {
    const { width, height } = Dimensions.get('window');
    return width > height;
  },

  /**
   * Obtém a largura e altura atual da tela
   */
  getScreenDimensions: () => {
    return Dimensions.get('window');
  },
};

// Exportar também um hook para escutar mudanças de orientação
// Isso seria implementado com uma biblioteca específica no futuro
export default OrientationUtil; 