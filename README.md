# BRK Telemetria

BRK Telemetria é um aplicativo móvel desenvolvido em React Native para monitoramento e análise de velocidade e localização em tempo real. O aplicativo oferece uma interface moderna e intuitiva para rastrear sessões de movimento, calcular velocidades e armazenar dados de telemetria.

## Funcionalidades Principais

### 1. Tela Inicial (HomeScreen)
- Interface moderna com gradiente e efeitos visuais
- Botão para iniciar nova sessão de rastreamento
- Navegação para histórico de sessões
- Design responsivo com animações suaves

### 2. Rastreamento de Velocidade (SpeedTrackingScreen)
- Monitoramento em tempo real da velocidade atual
- Cálculo preciso de velocidade usando o algoritmo de Haversine
- Exibição de coordenadas GPS (latitude, longitude)
- Informações de altitude e precisão do GPS
- Botão para finalizar e salvar a sessão

### 3. Histórico de Sessões (SessionsScreen)
- Lista de todas as sessões salvas
- Exibição de data/hora e quantidade de pontos de cada sessão
- Opção para excluir sessões
- Navegação para detalhes de cada sessão
- Importação e exportação de sessões em formato JSON
- Compartilhamento de sessões via arquivo

### 4. Detalhes da Sessão (SessionDetailScreen)
- Visualização detalhada de uma sessão específica
- Lista de todos os pontos registrados com:
  - Coordenadas GPS
  - Timestamp
  - Altitude
  - Precisão do GPS
- Interface organizada e fácil de navegar

## Tecnologias Utilizadas

- React Native
- TypeScript
- @react-native-community/geolocation
- @react-native-async-storage/async-storage
- react-native-reanimated
- react-native-linear-gradient
- @react-native-community/blur
- react-native-fs
- react-native-share
- react-native-document-picker

## Armazenamento de Dados

O aplicativo utiliza AsyncStorage para persistir os dados localmente no dispositivo. Cada sessão contém:
- ID único
- Data/hora de início
- Array de pontos com:
  - Latitude
  - Longitude
  - Timestamp
  - Altitude (opcional)
  - Precisão do GPS (opcional)

## Importação e Exportação

O aplicativo permite:
- Exportar todas as sessões para um arquivo JSON
- Importar sessões de um arquivo JSON
- Compartilhar sessões exportadas
- Mesclagem automática de sessões importadas com as existentes
- Prevenção de duplicatas baseada no ID da sessão

## Cálculo de Velocidade

A velocidade é calculada usando o algoritmo de Haversine, que considera:
- Distância entre pontos consecutivos
- Diferença de tempo entre as medições
- Conversão para km/h
- Filtragem de dados imprecisos

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
