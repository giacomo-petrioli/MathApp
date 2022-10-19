import { View, Text, RefreshControl, TouchableOpacity, Share, Switch, Linking, Dimensions, StyleSheet, Clipboard, ActivityIndicator, ScrollView, ToastAndroid } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VictoryChart, VictoryTheme, VictoryLine } from "victory-native";
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useState, useRef, useEffect, } from "react";
import BottomSheet from "./localLibrary/bottomSheet/index";
import Svg, { Rect, Line, Path } from 'react-native-svg';
import { Picker } from '@react-native-picker/picker';
import * as Progress from 'react-native-progress';
import * as StoreReview from 'expo-store-review';
import { WebView } from 'react-native-webview';
import MathJax from './localLibrary/mathJax';
import 'abortcontroller-polyfill';

var windowWidth = Dimensions.get('window').width;
var windowHeigth = Dimensions.get('window').height;

function HomeScreen({ navigation, route }) {
	React.useEffect(() => {
		const unsubscribe = navigation.addListener('focus', () => {
			ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT)
		});

		return unsubscribe;
	}, [navigation]);

	const webViewRef = useRef();

	var [mainKeyboard, setMainKeyboard] = useState(true);
	const [isVisible, setVisible] = useState(false);

	var [text, setText] = useState('');
	var [lingua, setLingua] = useState('it');
	var [loading, setLoading] = useState(false);
	var [prevPormpt, setPrevPrompt] = useState('');
	var [prevSolutionContainer, setPrevSolutionContainer] = useState({});
	var [isEnabled, setIsEnabled] = useState(false);
	var [selectedValue, setSelectedValue] = useState('')

	var historyText = route?.params?.mathText;

	useEffect(() => {
		if (historyText == undefined) return
		setText(text => historyText);
		comando('deleteToGroupStart');
		webViewRef.current.injectJavaScript("changeData('" + historyText.split("\\").join("\\\\") + "');")
	}, [historyText])

	useEffect(() => {
		getSettings();
	})

	async function getSettings() {
		try {
			var registerHistory = await AsyncStorage.getItem('registerHistory');
			if (registerHistory === null) {

			}
			var language = await AsyncStorage.getItem('lingua');
			if (language === null) {

			}
		} catch (error) {

		}
		setIsEnabled(JSON.parse(registerHistory))
		setSelectedValue(language)
	}

	async function changeLanguage(itemValue) {
		setSelectedValue(selectedValue => itemValue)
		try {
			await AsyncStorage.setItem(
				'lingua',
				itemValue
			);
		} catch (error) {
			alert(error)
		}
	}

	async function toggleSwitch() {
		setIsEnabled(isEnabled => !isEnabled);

		try {
			await AsyncStorage.setItem(
				'registerHistory',
				JSON.stringify(!isEnabled)
			);
		} catch (error) {
			alert(error)
		}
	}

	async function solveEquation() {
		if (loading) {
			return
		}
		if (text.length == 0) {
			if (lingua == 'it') var message = "Inserisci Prima il Testo";
			else var message = "Enter the Text First";
			ToastAndroid.showWithGravityAndOffset(
				message,
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
				25,
				50
			);
			return
		}

		if (prevPormpt == text) {
			navigation.navigate("Solution", { solutionContainer: prevSolutionContainer });
			updateHistory();
			return;
		}

		var testo = text;
		setPrevPrompt(prevPormpt => text);
		setLoading(loading => true);

		var testo = testo.split("\\").join("%60");
		var testo = testo.split("%").join("%25");
		var testo = testo.split("{").join("%7B%20");
		var testo = testo.split('}').join('%20%20%7D');
		var testo = testo.split('+').join('%2B');
		var testo = testo.split("×").join("%20%60times%20%20");
		var testo = testo.split(":").join("%20%60div%20%20");
		var testo = testo.split("=").join("%20%3D%20%20");
		var testo = testo.split(">").join("%20>%20%20");
		var testo = testo.split("<").join("%20<%20%20");
		var testo = testo.split("|").join("%7C");
		var testo = testo.split(",").join(".");

		try {
			var value = await AsyncStorage.getItem('lingua');
			setLingua(lingua => value);
		} catch (error) {
			var value = "en";
		}

		var searchUrl = "https://mathapp-api-git-main-giacomo-petrioli.vercel.app/?text=" + testo + "&language=" + value;

		const controller = new AbortController();
		const timeout = setTimeout(() => {
			controller.abort();
		}, 10000);

		try {
			const response = await fetch(searchUrl, { signal: controller.signal });
			var htmlString = await response.text();
			var solutionContainer = JSON.parse(htmlString);
			updateHistory();

			navigation.navigate("Solution", { solutionContainer: solutionContainer });
			setPrevSolutionContainer(prevSolutionContainer => solutionContainer);
		} catch (error) {
			if (error.message == "Aborted") alert("Your Internet connection is absent or too slow")
			else alert(error.message)
		} finally {
			clearTimeout(timeout);
		}

		setLoading(loading => false);
	}

	async function updateHistory() {
		if (!isEnabled) return
		try {
			var pervHistory = await AsyncStorage.getItem('history');
			if (pervHistory === null) {
				pervHistory = ""
			}
		} catch (error) {

		}

		if (pervHistory.split(text).length == 1) {
			pervHistory = text + "," + pervHistory
			try {
				await AsyncStorage.setItem(
					'history',
					pervHistory
				);
			} catch (error) {
				alert(error)
			}
		}
	}

	function inserisci(buttonPressed) {
		if ((text.slice(-1) == "=") && (buttonPressed == "=")) {
			solveEquation();
			return;
		}
		if ((buttonPressed == "$$#@^{#0}$$") && (text.slice(-1) == ")")) {
			buttonPressed = "$$^{#0}$$";
		}
		webViewRef.current.injectJavaScript("changeData('" + buttonPressed + "');")
	}

	function comando(funzione) {
		if (funzione == 'deleteToGroupStart') {
			setText(text => "");
			webViewRef.current.injectJavaScript("changeComando('moveToMathFieldEnd');")
		} else {

		}
		webViewRef.current.injectJavaScript("changeComando('" + funzione + "');")
	}

	function onMessage(data) {
		setText(text => data.nativeEvent.data);
	}

	async function onShare() {
		try {
			const result = await Share.share({
				message: 'Check out MathApp app that gives me free step-by-step instuctions, graphs and more. Download it here: https://play.google.com/store/apps/details?id=com.Giacomo.Mathapp',
			});
		} catch (error) {
			alert(error.message);
		}
	};

	async function writeReview() {
		if (StoreReview.isAvailableAsync()) {
			await StoreReview.requestReview()
		}
	}

	async function clearHistory() {
		try {
			await AsyncStorage.removeItem(
				'history'
			);
		} catch (error) {
			alert(error)
		}
	}

	return (
		<View style={{ /*marginTop: StatusBar.currentHeight,*/ backgroundColor: "white", flex: 1 }}>
			<BottomSheet
				bottomSheetTitle={"Settings"}
				bottomSheetIconColor="black"
				bottomSheetStyle={{
					backgroundColor: "white",
					maxHeight: '70%',
					minHeight: '70%',
				}}
				bottomSheetTitleStyle={{ color: 'black', fontSize: 25, padding: 5 }}
				setBottomSheetVisible={setVisible}
				bottomSheetVisible={isVisible}
			>
				<ScrollView>
					<View style={styles.settingSeparator} />
					<View style={{ height: 1, width: '100%', backgroundColor: '#E0E0E0' }} />
					<TouchableOpacity style={styles.settingItem} onPress={() => onShare()}>
						<Text style={styles.settingText}>Invite Friends</Text>
					</TouchableOpacity>
					<View style={styles.settingSeparator} />
					<View style={styles.settingItem}>
						<Text style={styles.settingText} onPress={() => getSettings()}>Language</Text>
						<Picker selectedValue={selectedValue} style={{ height: 50, width: windowWidth - 200, position: 'absolute', right: 10 }} onValueChange={(itemValue) => changeLanguage(itemValue)}>
							<Picker.Item label="English" value="en" />
							<Picker.Item label="Italiano" value="it" />
							<Picker.Item label="Deutsch" value="de" />
							<Picker.Item label="Español" value="es" />
							<Picker.Item label="Français" value="fr" />
							<Picker.Item label="Português" value="pt" />
							<Picker.Item label="Русский" value="ru" />
							<Picker.Item label="简体中文" value="zh" />
							<Picker.Item label="繁體中文" value="zh-Hant" />
							<Picker.Item label="Bahasa Melayu" value="ms" />
							<Picker.Item label="Bahasa Indonesia" value="id" />
							<Picker.Item label="العربية" value="ar" />
							<Picker.Item label="Türkçe" value="tr" />
							<Picker.Item label="Polski" value="pl" />
							<Picker.Item label="Nederlands" value="nl" />
							<Picker.Item label="Slovenčina" value="sk" />
							<Picker.Item label="Română" value="ro" />
							<Picker.Item label="Tiếng Việt" value="vi" />
							<Picker.Item label="ελληνικά" value="el" />
							<Picker.Item label="ไทย" value="th" />
						</Picker>
					</View>
					<View style={styles.settingItem}>
						<Text style={styles.settingText}>Register History</Text>
						<Switch
							trackColor={{ false: "#767577", true: "#81b0ff" }}
							thumbColor={isEnabled ? "#51b0ff" : "#f4f3f4"}
							ios_backgroundColor="#3e3e3e"
							onValueChange={toggleSwitch}
							value={isEnabled}
							style={{ position: 'absolute', right: 20 }}
						/>
					</View>
					<TouchableOpacity style={styles.settingItem} onPress={() => clearHistory()}>
						<Text style={styles.settingText}>Clear History</Text>
					</TouchableOpacity>
					<View style={styles.settingSeparator} />
					<View style={styles.settingItem}>
						<Text onPress={() => Linking.openURL("https://www.freeprivacypolicy.com/live/59fc809a-5a39-4ee2-a464-09efbf775b8e")} style={[styles.settingText, { fontWeight: 'normal', color: 'blue' }]}>Privacy and Cookies</Text>
					</View>
					<View style={styles.settingSeparator} />
					<TouchableOpacity style={styles.settingItem} onPress={() => writeReview()}>
						<Text style={styles.settingText}>Make a Review</Text>
					</TouchableOpacity>
				</ScrollView>
			</BottomSheet>
			<View style={{ position: 'absolute', marginTop: 30, marginLeft: windowWidth - 70 }}>
				<TouchableOpacity onPress={() => setVisible(true)}>
					<AntDesign name="setting" size={40} color="darkgrey" />
				</TouchableOpacity>
			</View>
			<View style={{ position: 'absolute', marginTop: 30, marginLeft: 30 }}>
				<TouchableOpacity onPress={() => navigation.navigate('History')}>
					<MaterialCommunityIcons name="history" size={40} color="darkgrey" />
				</TouchableOpacity>
			</View>
			<View style={{ position: 'absolute', alignSelf: 'center', top: 30 }}>
				<TouchableOpacity onPress={() => navigation.navigate('Writing')}>
					<MaterialCommunityIcons name="draw" size={40} color="darkgrey" />
				</TouchableOpacity>
			</View>

			<View>
				<View style={styles.countContainer} />
				<View style={{ height: 200, padding: 10, marginTop: 50 }}>
					{loading ?
						<Progress.Bar style={{ position: 'absolute', left: 0, top: -30 }} color='#66ccff' width={windowWidth} animated={loading} indeterminate={loading} />
						:
						<View />
					}
					<WebView
						ref={webViewRef}
						onMessage={onMessage}
						scrollEnabled={false}
						textZoom={100}
						source={{
							html: `
							<html>
							<head>
								<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
							</head>
							<body>
							<div style="font-size: 200%;margin-top: 20px;">
								<math-field id="formula" style="padding: 20px;border-radius: 8px;border: 1px solid rgba(0, 0, 0, .3);">
									
								</math-field>
							</div>
							<script src="https://unpkg.com/mathlive/dist/mathlive.min.js"></script>
							
							</body>
					
							<script>

								const mf = document.getElementById('formula');
								document.getElementById("formula").setOptions({
									virtualKeyboardMode: "off"
								});
								document.getElementById('formula').addEventListener('input',(ev) => {
									var testo = ev.target.value;
									window.ReactNativeWebView.postMessage(testo);
								});

								function changeData(buttonPressed) {
									mf.executeCommand(['insert', buttonPressed]);
									mf.executeCommand('scrollIntoView');
								}

								function changeComando(funzione){
									mf.executeCommand(funzione);
									mf.executeCommand('scrollIntoView');
								}

							</script>
							</body>
							</html> 
                `}}
					/>
				</View>
				<View style={{ marginTop: windowHeigth - 750 }}>
					<View style={styles.toolbar}>
						<TouchableOpacity style={styles.toolbarButton} onPress={() => comando('moveToPreviousChar')}>
							<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
								<Path d="M24 15.5H9.95312L16.1016 21.6484L15.3984 22.3516L8.04688 15L15.3984 7.64844L16.1016 8.35156L9.95312 14.5H24V15.5Z" fill="black" />
							</Svg>
						</TouchableOpacity>
						<TouchableOpacity style={styles.toolbarButton} onPress={() => comando('moveToNextChar')}>
							<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
								<Path d="M23.9531 15L16.6016 22.3516L15.8984 21.6484L22.0469 15.5H8V14.5H22.0469L15.8984 8.35156L16.6016 7.64844L23.9531 15Z" fill="black" />
							</Svg>
						</TouchableOpacity>
						<TouchableOpacity style={styles.toolbarButton} onPress={() => comando('deleteBackward')}>
							<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
								<Path d="M15.8516 17.8516L15.1484 17.1484L17.2891 15L15.1484 12.8516L15.8516 12.1484L18 14.2891L20.1484 12.1484L20.8516 12.8516L18.7109 15L20.8516 17.1484L20.1484 17.8516L18 15.7109L15.8516 17.8516ZM14 9H24V21H14L8 15L14 9ZM23 20V10H14.4141L9.41406 15L14.4141 20H23Z" fill="black" />
							</Svg>
						</TouchableOpacity>
						<TouchableOpacity style={styles.toolbarButton} onPress={() => comando('deleteToGroupStart')}>
							<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
								<Path d="M15.6924 19.6709H14.6016L13.7101 17.3132H10.1443L9.30562 19.6709H8.20889L11.4346 11.2607H12.455L15.6924 19.6709ZM13.3875 16.4276L12.068 12.8442C12.0249 12.7269 11.9819 12.5393 11.9389 12.2812H11.9155C11.8764 12.5197 11.8314 12.7074 11.7806 12.8442L10.4727 16.4276H13.3875ZM22.6578 19.319C22.0362 19.6474 21.262 19.8117 20.3354 19.8117C19.1389 19.8117 18.181 19.4265 17.4616 18.6563C16.7422 17.886 16.3824 16.8753 16.3824 15.6242C16.3824 14.2792 16.7871 13.1922 17.5965 12.3633C18.4058 11.5344 19.4322 11.12 20.6755 11.12C21.4731 11.12 22.1339 11.2353 22.6578 11.466V12.5158C22.0557 12.1795 21.391 12.0114 20.6638 12.0114C19.698 12.0114 18.9141 12.334 18.312 12.9791C17.7138 13.6242 17.4147 14.4864 17.4147 15.5655C17.4147 16.5899 17.6942 17.4071 18.2533 18.017C18.8164 18.623 19.5534 18.9261 20.4644 18.9261C21.3089 18.9261 22.0401 18.7384 22.6578 18.363V19.319Z" fill="black" />
							</Svg>
						</TouchableOpacity>
						<TouchableOpacity style={styles.toolbarButton} onPress={() => solveEquation()}>
							<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
								<Path d="M24.6016 15.4998L9.14062 22.3982L10.8594 15.4998L9.14062 8.60132L24.6016 15.4998ZM10.6094 10.3513L11.7734 15.0232H21.0703L10.6094 10.3513ZM11.7578 16.0232L10.6094 20.6482L20.9766 16.0232H11.7578Z" fill="black" />
							</Svg>
						</TouchableOpacity>
						<TouchableOpacity style={styles.toolbarButton} onPress={() => setMainKeyboard(!mainKeyboard)}>
							<Text style={{ fontSize: 30, textAlign: 'center' }}>{mainKeyboard ? "f(x)" : "123"}</Text>
						</TouchableOpacity>
					</View>
					{mainKeyboard ?
						<View style={styles.keyboardContainer}>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("(")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M16.8188 8C15.9632 9.01111 15.3385 10.1097 14.9448 11.2958C14.551 12.4819 14.3542 13.7361 14.3542 15.0583C14.3542 15.7097 14.4003 16.3441 14.4927 16.9615C14.5851 17.5788 14.7333 18.1792 14.9375 18.7625C15.1417 19.3458 15.3969 19.9073 15.7031 20.4469C16.0094 20.9865 16.3813 21.5042 16.8188 22H17.9781C17.1372 20.9889 16.5149 19.9049 16.1115 18.7479C15.708 17.591 15.5038 16.3538 15.499 15.0365C15.499 13.7094 15.7031 12.4625 16.1115 11.2958C16.5198 10.1292 17.1493 9.03056 18 8H16.8188Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("$$\\\\sqrt{#0}$$")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M6.69262 15.7628L9.00678 22.8275H10.7424L14.1566 9.42329H16.9271V8.24176H13.1788L9.91126 21.4423H9.77274L7.99637 15.7628H6.69262Z" fill="#444444" />
										<Rect x="15.4294" y="13.594" width="9.17841" height="9.17841" stroke="#767676" stroke-width="0.834403" stroke-linejoin="round" stroke-dasharray="1.67 0.5" />
										<Line x1="13.1758" y1="9.03812" x2="25.358" y2="9.03812" stroke="#444444" stroke-width="1.60149" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("$$#0^{#0}$$")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Rect x="18.4294" y="6.42501" width="5.84081" height="5.84081" stroke="#767676" stroke-width="0.834403" stroke-linejoin="round" stroke-dasharray="1.67 0.5" />
										<Rect x="8.4172" y="14.4348" width="9.17841" height="9.17841" stroke="#767676" stroke-width="0.834403" stroke-linejoin="round" stroke-dasharray="1.67 0.5" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("y")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M19.7627 12.9998L15.623 23.4412C14.8848 25.3045 13.8477 26.2361 12.5117 26.2361C12.1367 26.2361 11.8232 26.1981 11.5713 26.1219V24.8299C11.8818 24.9354 12.166 24.9881 12.4238 24.9881C13.1504 24.9881 13.6953 24.5545 14.0586 23.6873L14.7793 21.9822L11.2637 12.9998H12.8633L15.2979 19.9256C15.3271 20.0135 15.3887 20.242 15.4824 20.6111H15.5352C15.5645 20.4705 15.623 20.2479 15.7109 19.9432L18.2686 12.9998H19.7627Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci(")")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M15.1812 8C16.0368 9.01111 16.6615 10.1097 17.0552 11.2958C17.449 12.4819 17.6458 13.7361 17.6458 15.0583C17.6458 15.7097 17.5997 16.3441 17.5073 16.9615C17.4149 17.5788 17.2667 18.1792 17.0625 18.7625C16.8583 19.3458 16.6031 19.9073 16.2969 20.4469C15.9906 20.9865 15.6187 21.5042 15.1812 22H14.0219C14.8628 20.9889 15.4851 19.9049 15.8885 18.7479C16.292 17.591 16.4962 16.3538 16.501 15.0365C16.501 13.7094 16.2969 12.4625 15.8885 11.2958C15.4802 10.1292 14.8507 9.03056 14 8H15.1812Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("$$\\\\frac{#0}{#0}$$")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none">
										<Rect x="11.4195" y="2.75299" width="9.17522" height="9.17522" stroke="#767676" stroke-width="0.83411" stroke-linejoin="round" stroke-dasharray="1.67 0.5" />
										<Rect x="11.4195" y="18.1006" width="9.17522" height="9.17522" stroke="#767676" stroke-width="0.83411" stroke-linejoin="round" stroke-dasharray="1.67 0.5" />
										<Line x1="8" y1="14.6802" x2="24.0149" y2="14.6802" stroke="#444444" stroke-width="1.00093" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("x")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M19.4023 12.9998L16.3789 17.5526L19.3496 21.9998H17.6709L15.9043 19.0818C15.793 18.9002 15.6611 18.6717 15.5088 18.3963H15.4736C15.4443 18.449 15.3066 18.6776 15.0605 19.0818L13.2588 21.9998H11.5977L14.665 17.5877L11.7295 12.9998H13.4082L15.1484 16.076C15.2773 16.3045 15.4033 16.5389 15.5264 16.7791H15.5615L17.8115 12.9998H19.4023Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("z")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M19.165 13.4129L13.8389 20.7693H19.1123V21.9998H11.7207V21.5516L17.0469 14.2303H12.2217V12.9998H19.165V13.4129Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("7")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M13.0927 21.0068H14.7538L20.3964 9.79199V8.32422H12.0028V9.73047H18.8319V9.76562L13.0927 21.0068Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("4")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M17.8739 21.0068H19.4032V18.3701H21.1962V16.9814H19.4032V8.32422H17.0653C14.0683 12.6221 12.5829 14.9336 11.5018 16.9375V18.3701H17.8739V21.0068ZM13.0663 16.9463C14.0683 15.1885 15.4481 13.0703 17.8475 9.64258H17.8739V16.9814H13.0663V16.9463Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("1")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M16.6948 21.0059H18.2241V8.32324H16.6772L13.3022 10.749V12.3398L16.6596 10.002H16.6948V21.0059Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("0")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M16.4311 21.2188C19.3842 21.2188 21.0893 18.6611 21.0893 14.6533C21.0893 10.6719 19.3755 8.11426 16.4311 8.11426C13.4868 8.11426 11.7553 10.6895 11.7553 14.6621C11.7553 18.6699 13.4692 21.2188 16.4311 21.2188ZM16.4311 19.8389C14.4448 19.8389 13.3462 17.8174 13.3462 14.6533C13.3462 11.5596 14.4712 9.50293 16.4311 9.50293C18.3911 9.50293 19.4985 11.542 19.4985 14.6621C19.4985 17.8262 18.4087 19.8389 16.4311 19.8389Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("8")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M16.2479 21.2178C18.9374 21.2178 20.8534 19.7061 20.8534 17.5791C20.8534 16.0059 19.7636 14.7051 18.12 14.3184V14.2832C19.5263 13.835 20.3788 12.7715 20.3788 11.4531C20.3788 9.51953 18.6474 8.11328 16.2479 8.11328C13.8661 8.11328 12.1083 9.52832 12.1083 11.4443C12.1083 12.7803 12.9784 13.8525 14.3759 14.2832V14.3184C12.7411 14.6963 11.6513 15.9971 11.6513 17.5791C11.6513 19.6973 13.5673 21.2178 16.2479 21.2178ZM16.2479 13.6943C14.7362 13.6943 13.6815 12.8242 13.6815 11.5938C13.6815 10.3545 14.7362 9.47559 16.2479 9.47559C17.7597 9.47559 18.8143 10.3457 18.8143 11.5938C18.8143 12.8242 17.7509 13.6943 16.2479 13.6943ZM16.2479 19.8379C14.5077 19.8379 13.2597 18.8447 13.2597 17.4648C13.2597 16.0762 14.5077 15.083 16.2479 15.083C17.997 15.083 19.2362 16.0674 19.2362 17.4648C19.2362 18.8447 17.997 19.8379 16.2479 19.8379Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("5")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M16.3798 21.2178C19.0253 21.2178 20.8974 19.4336 20.8974 16.8848C20.8974 14.4502 19.1395 12.6836 16.705 12.6836C15.4745 12.6836 14.4198 13.1406 13.8222 13.9932H13.787L14.2177 9.73047H20.1767V8.32422H12.9169L12.2665 15.5576H13.664C14.2528 14.5381 15.2196 14.0459 16.4237 14.0459C18.1112 14.0459 19.3153 15.25 19.3153 16.9287C19.3153 18.6338 18.12 19.8291 16.3974 19.8291C14.8768 19.8291 13.7255 18.8975 13.5849 17.5439H12.0292C12.161 19.7061 13.954 21.2178 16.3798 21.2178Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("2")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M11.5255 11.9883H13.0548C13.0548 10.5645 14.2325 9.49219 15.797 9.49219C17.2472 9.49219 18.1788 10.4854 18.1788 11.7334C18.1788 12.7881 17.7833 13.4736 16.0694 15.2578L11.6046 19.916V21.0059H19.9718V19.5996H13.7755V19.5645L16.7901 16.4707C19.1192 14.0801 19.7608 13.0342 19.7608 11.6367C19.7608 9.71191 18.1437 8.1123 15.797 8.1123C13.3536 8.1123 11.5255 9.76465 11.5255 11.9883Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci(",")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M15.7956 21.952C15.7636 21.924 15.7416 21.898 15.7296 21.874C15.7176 21.85 15.7116 21.82 15.7116 21.784C15.7116 21.756 15.7196 21.728 15.7356 21.7C15.7556 21.672 15.7776 21.646 15.8016 21.622C15.8416 21.578 15.8916 21.52 15.9516 21.448C16.0156 21.376 16.0796 21.29 16.1436 21.19C16.2076 21.094 16.2656 20.986 16.3176 20.866C16.3736 20.75 16.4136 20.626 16.4376 20.494C16.4256 20.498 16.4116 20.5 16.3956 20.5C16.3836 20.5 16.3716 20.5 16.3596 20.5C16.1516 20.5 15.9816 20.432 15.8496 20.296C15.7216 20.156 15.6576 19.978 15.6576 19.762C15.6576 19.574 15.7216 19.414 15.8496 19.282C15.9816 19.15 16.1556 19.084 16.3716 19.084C16.4916 19.084 16.5976 19.106 16.6896 19.15C16.7816 19.194 16.8576 19.256 16.9176 19.336C16.9816 19.412 17.0296 19.502 17.0616 19.606C17.0936 19.706 17.1096 19.816 17.1096 19.936C17.1096 20.116 17.0836 20.304 17.0316 20.5C16.9836 20.692 16.9096 20.882 16.8096 21.07C16.7136 21.262 16.5956 21.448 16.4556 21.628C16.3156 21.808 16.1556 21.974 15.9756 22.126L15.7956 21.952Z" fill="black" />
									</Svg>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("9")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M15.9317 21.2178C19.0342 21.2178 20.8447 18.7217 20.8447 14.4502C20.8447 9.64258 18.2959 8.10449 16.0283 8.10449C13.4268 8.10449 11.5371 9.93262 11.5371 12.4375C11.5371 14.8457 13.3301 16.6299 15.7471 16.6299C17.3643 16.6299 18.7529 15.8125 19.2891 14.5557H19.3154C19.2715 17.9219 18.1026 19.8379 15.9492 19.8379C14.6309 19.8379 13.6377 19.2314 13.2861 18.0625H11.6777C12.0469 19.9697 13.7432 21.2178 15.9317 21.2178ZM16.0195 15.2412C14.3584 15.2412 13.1367 14.0371 13.1367 12.3848C13.1367 10.7939 14.4199 9.52832 16.0459 9.52832C17.6807 9.52832 18.9463 10.8027 18.9463 12.4287C18.9463 14.0459 17.6983 15.2412 16.0195 15.2412Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("6")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M16.4854 21.2266C19.0869 21.2266 20.9766 19.3984 20.9766 16.8936C20.9766 14.4854 19.1836 12.7012 16.7666 12.7012C15.044 12.7012 13.7432 13.6152 13.2246 14.7578H13.1983C13.251 11.3828 14.4551 9.50195 16.5733 9.50195C17.874 9.50195 18.8233 10.1611 19.1924 11.3037H20.8008C20.4053 9.36133 18.7442 8.10449 16.5908 8.10449C13.4883 8.10449 11.669 10.6094 11.669 14.8809C11.669 19.6006 14.1475 21.2266 16.4854 21.2266ZM16.4678 19.8203C14.8418 19.8203 13.5762 18.5283 13.5762 16.9023C13.5762 15.2852 14.8154 14.0898 16.4942 14.0898C18.1729 14.0898 19.3682 15.2852 19.3682 16.9463C19.3682 18.5459 18.085 19.8203 16.4678 19.8203Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'white' }]} onPress={() => inserisci("3")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M14.1232 15.126H15.714C17.4982 15.126 18.6144 16.0049 18.6056 17.5693C18.5969 18.8965 17.4806 19.8457 15.8107 19.8457C14.1232 19.8457 12.9367 18.9932 12.84 17.6484H11.3195C11.4338 19.749 13.1828 21.2168 15.8107 21.2168C18.298 21.2168 20.214 19.6963 20.214 17.5166C20.214 15.7148 18.9572 14.5635 17.1115 14.4053V14.3701C18.7023 14.0361 19.801 12.9551 19.801 11.3818C19.801 9.57129 18.3332 8.1123 15.7931 8.1123C13.4201 8.1123 11.7502 9.49219 11.5744 11.6455H13.0949C13.1916 10.2744 14.299 9.4834 15.7931 9.4834C17.4191 9.4834 18.2101 10.3359 18.2101 11.5928C18.2101 12.8584 17.1554 13.79 15.6437 13.79H14.1232V15.126Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("=")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M8.5 18V17H23.5V18H8.5ZM8.5 11H23.5V12H8.5V11Z" fill="black" />
									</Svg>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci(":")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M17 20.5007C17 20.6413 16.974 20.7715 16.9219 20.8913C16.8698 21.0111 16.7995 21.1152 16.7109 21.2038C16.6224 21.2923 16.5156 21.3652 16.3906 21.4225C16.2656 21.4798 16.1354 21.5059 16 21.5007C15.8594 21.5007 15.7292 21.4746 15.6094 21.4225C15.4896 21.3704 15.3854 21.3001 15.2969 21.2116C15.2083 21.123 15.1354 21.0163 15.0781 20.8913C15.0208 20.7663 14.9948 20.6361 15 20.5007C15 20.36 15.026 20.2298 15.0781 20.11C15.1302 19.9902 15.2005 19.8861 15.2891 19.7975C15.3776 19.709 15.4844 19.6361 15.6094 19.5788C15.7344 19.5215 15.8646 19.4954 16 19.5007C16.1406 19.5007 16.2708 19.5267 16.3906 19.5788C16.5104 19.6309 16.6146 19.7012 16.7031 19.7897C16.7917 19.8783 16.8646 19.985 16.9219 20.11C16.9792 20.235 17.0052 20.3652 17 20.5007ZM17 9.50065C17 9.64128 16.974 9.77148 16.9219 9.89128C16.8698 10.0111 16.7995 10.1152 16.7109 10.2038C16.6224 10.2923 16.5156 10.3652 16.3906 10.4225C16.2656 10.4798 16.1354 10.5059 16 10.5007C15.8594 10.5007 15.7292 10.4746 15.6094 10.4225C15.4896 10.3704 15.3854 10.3001 15.2969 10.2116C15.2083 10.123 15.1354 10.0163 15.0781 9.89128C15.0208 9.76628 14.9948 9.63607 15 9.50065C15 9.36003 15.026 9.22982 15.0781 9.11003C15.1302 8.99023 15.2005 8.88607 15.2891 8.79753C15.3776 8.70898 15.4844 8.63607 15.6094 8.57878C15.7344 8.52148 15.8646 8.49544 16 8.50065C16.1406 8.50065 16.2708 8.52669 16.3906 8.57878C16.5104 8.63086 16.6146 8.70117 16.7031 8.78971C16.7917 8.87826 16.8646 8.98503 16.9219 9.11003C16.9792 9.23503 17.0052 9.36523 17 9.50065ZM23.5 15.5007H8.5V14.5007H23.5V15.5007Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("×")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M22.7031 9.20312L16.8047 15.1016L22.7031 21L22 21.7031L16.1016 15.8047L10.2031 21.7031L9.5 21L15.3984 15.1016L9.5 9.20312L10.2031 8.5L16.1016 14.3984L22 8.5L22.7031 9.20312Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("-")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M8.5 14H23.5V15H8.5V14Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("+")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M23.5 14.5V15.5H16.5V22.5H15.5V15.5H8.5V14.5H15.5V7.5H16.5V14.5H23.5Z" fill="black" />
									</Svg>
								</TouchableOpacity>
							</View>
						</View> :
						<View style={styles.keyboardContainer}>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("<")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M22 10V11.5187L12.7177 15.3955L22 19.2123V20.751L10 15.8451V14.9559L22 10Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("\\\\leq")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M21.4656 16.6438V18.0875L10.2063 13.4844V12.65L21.4656 8V9.425L12.7563 13.0625L21.4656 16.6438ZM10 20.075H22V21.275H10V20.075Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("cos({#0})")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M12.2266 19.7246C11.7656 20.002 11.2188 20.1406 10.5859 20.1406C9.73047 20.1406 9.03906 19.8633 8.51172 19.3086C7.98828 18.75 7.72656 18.0273 7.72656 17.1406C7.72656 16.1523 8.00977 15.3594 8.57617 14.7617C9.14258 14.1602 9.89844 13.8594 10.8438 13.8594C11.3711 13.8594 11.8359 13.957 12.2383 14.1523V15.1367C11.793 14.8242 11.3164 14.668 10.8086 14.668C10.1953 14.668 9.69141 14.8887 9.29688 15.3301C8.90625 15.7676 8.71094 16.3438 8.71094 17.0586C8.71094 17.7617 8.89453 18.3164 9.26172 18.7227C9.63281 19.1289 10.1289 19.332 10.75 19.332C11.2734 19.332 11.7656 19.1582 12.2266 18.8105V19.7246ZM16.1875 20.1406C15.3008 20.1406 14.5918 19.8613 14.0605 19.3027C13.5332 18.7402 13.2695 17.9961 13.2695 17.0703C13.2695 16.0625 13.5449 15.2754 14.0957 14.709C14.6465 14.1426 15.3906 13.8594 16.3281 13.8594C17.2227 13.8594 17.9199 14.1348 18.4199 14.6855C18.9238 15.2363 19.1758 16 19.1758 16.9766C19.1758 17.9336 18.9043 18.7012 18.3613 19.2793C17.8223 19.8535 17.0977 20.1406 16.1875 20.1406ZM16.2578 14.668C15.6406 14.668 15.1523 14.8789 14.793 15.3008C14.4336 15.7188 14.2539 16.2969 14.2539 17.0352C14.2539 17.7461 14.4355 18.3066 14.7988 18.7168C15.1621 19.127 15.6484 19.332 16.2578 19.332C16.8789 19.332 17.3555 19.1309 17.6875 18.7285C18.0234 18.3262 18.1914 17.7539 18.1914 17.0117C18.1914 16.2617 18.0234 15.6836 17.6875 15.2773C17.3555 14.8711 16.8789 14.668 16.2578 14.668ZM20.3477 19.7832V18.752C20.8711 19.1387 21.4473 19.332 22.0762 19.332C22.9199 19.332 23.3418 19.0508 23.3418 18.4883C23.3418 18.3281 23.3047 18.1934 23.2305 18.084C23.1602 17.9707 23.0625 17.8711 22.9375 17.7852C22.8164 17.6992 22.6719 17.623 22.5039 17.5566C22.3398 17.4863 22.1621 17.4141 21.9707 17.3398C21.7051 17.2344 21.4707 17.1289 21.2676 17.0234C21.0684 16.9141 20.9004 16.793 20.7637 16.6602C20.6309 16.5234 20.5293 16.3691 20.459 16.1973C20.3926 16.0254 20.3594 15.8242 20.3594 15.5938C20.3594 15.3125 20.4238 15.0645 20.5527 14.8496C20.6816 14.6309 20.8535 14.4492 21.0684 14.3047C21.2832 14.1562 21.5273 14.0449 21.8008 13.9707C22.0781 13.8965 22.3633 13.8594 22.6562 13.8594C23.1758 13.8594 23.6406 13.9492 24.0508 14.1289V15.1016C23.6094 14.8125 23.1016 14.668 22.5273 14.668C22.3477 14.668 22.1855 14.6895 22.041 14.7324C21.8965 14.7715 21.7715 14.8281 21.666 14.9023C21.5645 14.9766 21.4844 15.0664 21.4258 15.1719C21.3711 15.2734 21.3438 15.3867 21.3438 15.5117C21.3438 15.668 21.3711 15.7988 21.4258 15.9043C21.4844 16.0098 21.5684 16.1035 21.6777 16.1855C21.7871 16.2676 21.9199 16.3418 22.0762 16.4082C22.2324 16.4746 22.4102 16.5469 22.6094 16.625C22.875 16.7266 23.1133 16.832 23.3242 16.9414C23.5352 17.0469 23.7148 17.168 23.8633 17.3047C24.0117 17.4375 24.125 17.5918 24.2031 17.7676C24.2852 17.9434 24.3262 18.1523 24.3262 18.3945C24.3262 18.6914 24.2598 18.9492 24.127 19.168C23.998 19.3867 23.8242 19.5684 23.6055 19.7129C23.3867 19.8574 23.1348 19.9648 22.8496 20.0352C22.5645 20.1055 22.2656 20.1406 21.9531 20.1406C21.3359 20.1406 20.8008 20.0215 20.3477 19.7832Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("csc({#0})")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M12.4707 19.7246C12.0098 20.002 11.4629 20.1406 10.8301 20.1406C9.97461 20.1406 9.2832 19.8633 8.75586 19.3086C8.23242 18.75 7.9707 18.0273 7.9707 17.1406C7.9707 16.1523 8.25391 15.3594 8.82031 14.7617C9.38672 14.1602 10.1426 13.8594 11.0879 13.8594C11.6152 13.8594 12.0801 13.957 12.4824 14.1523V15.1367C12.0371 14.8242 11.5605 14.668 11.0527 14.668C10.4395 14.668 9.93555 14.8887 9.54102 15.3301C9.15039 15.7676 8.95508 16.3438 8.95508 17.0586C8.95508 17.7617 9.13867 18.3164 9.50586 18.7227C9.87695 19.1289 10.373 19.332 10.9941 19.332C11.5176 19.332 12.0098 19.1582 12.4707 18.8105V19.7246ZM13.5605 19.7832V18.752C14.084 19.1387 14.6602 19.332 15.2891 19.332C16.1328 19.332 16.5547 19.0508 16.5547 18.4883C16.5547 18.3281 16.5176 18.1934 16.4434 18.084C16.373 17.9707 16.2754 17.8711 16.1504 17.7852C16.0293 17.6992 15.8848 17.623 15.7168 17.5566C15.5527 17.4863 15.375 17.4141 15.1836 17.3398C14.918 17.2344 14.6836 17.1289 14.4805 17.0234C14.2812 16.9141 14.1133 16.793 13.9766 16.6602C13.8438 16.5234 13.7422 16.3691 13.6719 16.1973C13.6055 16.0254 13.5723 15.8242 13.5723 15.5938C13.5723 15.3125 13.6367 15.0645 13.7656 14.8496C13.8945 14.6309 14.0664 14.4492 14.2812 14.3047C14.4961 14.1562 14.7402 14.0449 15.0137 13.9707C15.291 13.8965 15.5762 13.8594 15.8691 13.8594C16.3887 13.8594 16.8535 13.9492 17.2637 14.1289V15.1016C16.8223 14.8125 16.3145 14.668 15.7402 14.668C15.5605 14.668 15.3984 14.6895 15.2539 14.7324C15.1094 14.7715 14.9844 14.8281 14.8789 14.9023C14.7773 14.9766 14.6973 15.0664 14.6387 15.1719C14.584 15.2734 14.5566 15.3867 14.5566 15.5117C14.5566 15.668 14.584 15.7988 14.6387 15.9043C14.6973 16.0098 14.7812 16.1035 14.8906 16.1855C15 16.2676 15.1328 16.3418 15.2891 16.4082C15.4453 16.4746 15.623 16.5469 15.8223 16.625C16.0879 16.7266 16.3262 16.832 16.5371 16.9414C16.748 17.0469 16.9277 17.168 17.0762 17.3047C17.2246 17.4375 17.3379 17.5918 17.416 17.7676C17.498 17.9434 17.5391 18.1523 17.5391 18.3945C17.5391 18.6914 17.4727 18.9492 17.3398 19.168C17.2109 19.3867 17.0371 19.5684 16.8184 19.7129C16.5996 19.8574 16.3477 19.9648 16.0625 20.0352C15.7773 20.1055 15.4785 20.1406 15.166 20.1406C14.5488 20.1406 14.0137 20.0215 13.5605 19.7832ZM23.1113 19.7246C22.6504 20.002 22.1035 20.1406 21.4707 20.1406C20.6152 20.1406 19.9238 19.8633 19.3965 19.3086C18.873 18.75 18.6113 18.0273 18.6113 17.1406C18.6113 16.1523 18.8945 15.3594 19.4609 14.7617C20.0273 14.1602 20.7832 13.8594 21.7285 13.8594C22.2559 13.8594 22.7207 13.957 23.123 14.1523V15.1367C22.6777 14.8242 22.2012 14.668 21.6934 14.668C21.0801 14.668 20.5762 14.8887 20.1816 15.3301C19.791 15.7676 19.5957 16.3438 19.5957 17.0586C19.5957 17.7617 19.7793 18.3164 20.1465 18.7227C20.5176 19.1289 21.0137 19.332 21.6348 19.332C22.1582 19.332 22.6504 19.1582 23.1113 18.8105V19.7246Z" fill="black" />
									</Svg>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci(">")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M10 10L22 14.9559V15.8451L10 20.751V19.2123L19.2823 15.3955L10 11.5187V10Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("\\\\geq")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M21.7938 12.65V13.4844L10.5344 18.0875V16.6438L19.2438 13.0625L10.5344 9.425V8L21.7938 12.65ZM10 20.075H22V21.275H10V20.075Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("sin({#0})")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M9.70898 19.7832V18.752C10.2324 19.1387 10.8086 19.332 11.4375 19.332C12.2812 19.332 12.7031 19.0508 12.7031 18.4883C12.7031 18.3281 12.666 18.1934 12.5918 18.084C12.5215 17.9707 12.4238 17.8711 12.2988 17.7852C12.1777 17.6992 12.0332 17.623 11.8652 17.5566C11.7012 17.4863 11.5234 17.4141 11.332 17.3398C11.0664 17.2344 10.832 17.1289 10.6289 17.0234C10.4297 16.9141 10.2617 16.793 10.125 16.6602C9.99219 16.5234 9.89062 16.3691 9.82031 16.1973C9.75391 16.0254 9.7207 15.8242 9.7207 15.5938C9.7207 15.3125 9.78516 15.0645 9.91406 14.8496C10.043 14.6309 10.2148 14.4492 10.4297 14.3047C10.6445 14.1562 10.8887 14.0449 11.1621 13.9707C11.4395 13.8965 11.7246 13.8594 12.0176 13.8594C12.5371 13.8594 13.002 13.9492 13.4121 14.1289V15.1016C12.9707 14.8125 12.4629 14.668 11.8887 14.668C11.709 14.668 11.5469 14.6895 11.4023 14.7324C11.2578 14.7715 11.1328 14.8281 11.0273 14.9023C10.9258 14.9766 10.8457 15.0664 10.7871 15.1719C10.7324 15.2734 10.7051 15.3867 10.7051 15.5117C10.7051 15.668 10.7324 15.7988 10.7871 15.9043C10.8457 16.0098 10.9297 16.1035 11.0391 16.1855C11.1484 16.2676 11.2812 16.3418 11.4375 16.4082C11.5938 16.4746 11.7715 16.5469 11.9707 16.625C12.2363 16.7266 12.4746 16.832 12.6855 16.9414C12.8965 17.0469 13.0762 17.168 13.2246 17.3047C13.373 17.4375 13.4863 17.5918 13.5645 17.7676C13.6465 17.9434 13.6875 18.1523 13.6875 18.3945C13.6875 18.6914 13.6211 18.9492 13.4883 19.168C13.3594 19.3867 13.1855 19.5684 12.9668 19.7129C12.748 19.8574 12.4961 19.9648 12.2109 20.0352C11.9258 20.1055 11.627 20.1406 11.3145 20.1406C10.6973 20.1406 10.1621 20.0215 9.70898 19.7832ZM15.6621 12.4766C15.4902 12.4766 15.3438 12.418 15.2227 12.3008C15.1016 12.1836 15.041 12.0352 15.041 11.8555C15.041 11.6758 15.1016 11.5273 15.2227 11.4102C15.3438 11.2891 15.4902 11.2285 15.6621 11.2285C15.8379 11.2285 15.9863 11.2891 16.1074 11.4102C16.2324 11.5273 16.2949 11.6758 16.2949 11.8555C16.2949 12.0273 16.2324 12.1738 16.1074 12.2949C15.9863 12.416 15.8379 12.4766 15.6621 12.4766ZM16.1309 20H15.1699V14H16.1309V20ZM23.0566 20H22.0957V16.5781C22.0957 15.3047 21.6309 14.668 20.7012 14.668C20.2207 14.668 19.8223 14.8496 19.5059 15.2129C19.1934 15.5723 19.0371 16.0273 19.0371 16.5781V20H18.0762V14H19.0371V14.9961H19.0605C19.5137 14.2383 20.1699 13.8594 21.0293 13.8594C21.6855 13.8594 22.1875 14.0723 22.5352 14.498C22.8828 14.9199 23.0566 15.5312 23.0566 16.332V20Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("sec({#0})")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M7.64844 19.7832V18.752C8.17188 19.1387 8.74805 19.332 9.37695 19.332C10.2207 19.332 10.6426 19.0508 10.6426 18.4883C10.6426 18.3281 10.6055 18.1934 10.5312 18.084C10.4609 17.9707 10.3633 17.8711 10.2383 17.7852C10.1172 17.6992 9.97266 17.623 9.80469 17.5566C9.64062 17.4863 9.46289 17.4141 9.27148 17.3398C9.00586 17.2344 8.77148 17.1289 8.56836 17.0234C8.36914 16.9141 8.20117 16.793 8.06445 16.6602C7.93164 16.5234 7.83008 16.3691 7.75977 16.1973C7.69336 16.0254 7.66016 15.8242 7.66016 15.5938C7.66016 15.3125 7.72461 15.0645 7.85352 14.8496C7.98242 14.6309 8.1543 14.4492 8.36914 14.3047C8.58398 14.1562 8.82812 14.0449 9.10156 13.9707C9.37891 13.8965 9.66406 13.8594 9.95703 13.8594C10.4766 13.8594 10.9414 13.9492 11.3516 14.1289V15.1016C10.9102 14.8125 10.4023 14.668 9.82812 14.668C9.64844 14.668 9.48633 14.6895 9.3418 14.7324C9.19727 14.7715 9.07227 14.8281 8.9668 14.9023C8.86523 14.9766 8.78516 15.0664 8.72656 15.1719C8.67188 15.2734 8.64453 15.3867 8.64453 15.5117C8.64453 15.668 8.67188 15.7988 8.72656 15.9043C8.78516 16.0098 8.86914 16.1035 8.97852 16.1855C9.08789 16.2676 9.2207 16.3418 9.37695 16.4082C9.5332 16.4746 9.71094 16.5469 9.91016 16.625C10.1758 16.7266 10.4141 16.832 10.625 16.9414C10.8359 17.0469 11.0156 17.168 11.1641 17.3047C11.3125 17.4375 11.4258 17.5918 11.5039 17.7676C11.5859 17.9434 11.627 18.1523 11.627 18.3945C11.627 18.6914 11.5605 18.9492 11.4277 19.168C11.2988 19.3867 11.125 19.5684 10.9062 19.7129C10.6875 19.8574 10.4355 19.9648 10.1504 20.0352C9.86523 20.1055 9.56641 20.1406 9.25391 20.1406C8.63672 20.1406 8.10156 20.0215 7.64844 19.7832ZM17.9316 17.2402H13.6953C13.7109 17.9082 13.8906 18.4238 14.2344 18.7871C14.5781 19.1504 15.0508 19.332 15.6523 19.332C16.3281 19.332 16.9492 19.1094 17.5156 18.6641V19.5664C16.9883 19.9492 16.291 20.1406 15.4238 20.1406C14.5762 20.1406 13.9102 19.8691 13.4258 19.3262C12.9414 18.7793 12.6992 18.0117 12.6992 17.0234C12.6992 16.0898 12.9629 15.3301 13.4902 14.7441C14.0215 14.1543 14.6797 13.8594 15.4648 13.8594C16.25 13.8594 16.8574 14.1133 17.2871 14.6211C17.7168 15.1289 17.9316 15.834 17.9316 16.7363V17.2402ZM16.9473 16.4258C16.9434 15.8711 16.8086 15.4395 16.543 15.1309C16.2812 14.8223 15.916 14.668 15.4473 14.668C14.9941 14.668 14.6094 14.8301 14.293 15.1543C13.9766 15.4785 13.7812 15.9023 13.707 16.4258H16.9473ZM23.4805 19.7246C23.0195 20.002 22.4727 20.1406 21.8398 20.1406C20.9844 20.1406 20.293 19.8633 19.7656 19.3086C19.2422 18.75 18.9805 18.0273 18.9805 17.1406C18.9805 16.1523 19.2637 15.3594 19.8301 14.7617C20.3965 14.1602 21.1523 13.8594 22.0977 13.8594C22.625 13.8594 23.0898 13.957 23.4922 14.1523V15.1367C23.0469 14.8242 22.5703 14.668 22.0625 14.668C21.4492 14.668 20.9453 14.8887 20.5508 15.3301C20.1602 15.7676 19.9648 16.3438 19.9648 17.0586C19.9648 17.7617 20.1484 18.3164 20.5156 18.7227C20.8867 19.1289 21.3828 19.332 22.0039 19.332C22.5273 19.332 23.0195 19.1582 23.4805 18.8105V19.7246Z" fill="black" />
									</Svg>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("$$\\\\left|#0\\\\right|$$")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Rect x="11.4226" y="10.4289" width="9.17841" height="9.17841" stroke="#767676" stroke-width="0.834403" stroke-linejoin="round" stroke-dasharray="1.67 0.5" />
										<Line x1="6.50064" y1="7.34375" x2="6.50064" y2="22.6967" stroke="#444444" stroke-width="1.00128" />
										<Line x1="26.5265" y1="7.3418" x2="26.5265" y2="22.6948" stroke="#444444" stroke-width="1.00128" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("\\\\theta")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M15.4033 22.2109C14.0381 22.2109 12.9746 21.6221 12.2129 20.4443C11.4512 19.2666 11.0703 17.6113 11.0703 15.4785C11.0703 13.2344 11.4658 11.5146 12.2568 10.3193C13.0537 9.11816 14.1963 8.51758 15.6846 8.51758C18.5088 8.51758 19.9209 10.7646 19.9209 15.2588C19.9209 17.4736 19.5254 19.1875 18.7344 20.4004C17.9492 21.6074 16.8389 22.2109 15.4033 22.2109ZM18.4268 14.6523C18.3213 11.3828 17.3574 9.74805 15.5352 9.74805C14.6562 9.74805 13.9531 10.1934 13.4258 11.084C12.8984 11.9688 12.6055 13.1582 12.5469 14.6523H18.4268ZM18.4355 15.8125H12.5381C12.5674 17.4941 12.8428 18.7773 13.3643 19.6621C13.8857 20.541 14.6064 20.9805 15.5264 20.9805C16.4229 20.9805 17.123 20.5352 17.627 19.6445C18.1367 18.748 18.4062 17.4707 18.4355 15.8125Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("tan({#0})")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M10.7715 19.9415C10.5449 20.0665 10.2461 20.129 9.875 20.129C8.82422 20.129 8.29883 19.5431 8.29883 18.3712V14.8204H7.26758V14.0001H8.29883V12.5353L9.25977 12.2247V14.0001H10.7715V14.8204H9.25977V18.2013C9.25977 18.6036 9.32812 18.8907 9.46484 19.0626C9.60156 19.2345 9.82812 19.3204 10.1445 19.3204C10.3867 19.3204 10.5957 19.254 10.7715 19.1212V19.9415ZM16.3496 20.0001H15.3887V19.0626H15.3652C14.9473 19.7814 14.332 20.1407 13.5195 20.1407C12.9219 20.1407 12.4531 19.9825 12.1133 19.6661C11.7773 19.3497 11.6094 18.9298 11.6094 18.4064C11.6094 17.2853 12.2695 16.6329 13.5898 16.4493L15.3887 16.1974C15.3887 15.1779 14.9766 14.6681 14.1523 14.6681C13.4297 14.6681 12.7773 14.9142 12.1953 15.4064V14.422C12.7852 14.047 13.4648 13.8595 14.2344 13.8595C15.6445 13.8595 16.3496 14.6056 16.3496 16.0978V20.0001ZM15.3887 16.965L13.9414 17.1642C13.4961 17.2267 13.1602 17.338 12.9336 17.4982C12.707 17.6544 12.5938 17.9337 12.5938 18.3361C12.5938 18.629 12.6973 18.8693 12.9043 19.0568C13.1152 19.2404 13.3945 19.3322 13.7422 19.3322C14.2188 19.3322 14.6113 19.1661 14.9199 18.8341C15.2324 18.4982 15.3887 18.0743 15.3887 17.5626V16.965ZM23.1406 20.0001H22.1797V16.5782C22.1797 15.3048 21.7148 14.6681 20.7852 14.6681C20.3047 14.6681 19.9062 14.8497 19.5898 15.213C19.2773 15.5724 19.1211 16.0275 19.1211 16.5782V20.0001H18.1602V14.0001H19.1211V14.9962H19.1445C19.5977 14.2384 20.2539 13.8595 21.1133 13.8595C21.7695 13.8595 22.2715 14.0724 22.6191 14.4982C22.9668 14.92 23.1406 15.5314 23.1406 16.3322V20.0001Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("cot({#0})")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M12.2422 19.7247C11.7812 20.0021 11.2344 20.1407 10.6016 20.1407C9.74609 20.1407 9.05469 19.8634 8.52734 19.3087C8.00391 18.7501 7.74219 18.0275 7.74219 17.1407C7.74219 16.1525 8.02539 15.3595 8.5918 14.7618C9.1582 14.1603 9.91406 13.8595 10.8594 13.8595C11.3867 13.8595 11.8516 13.9572 12.2539 14.1525V15.1368C11.8086 14.8243 11.332 14.6681 10.8242 14.6681C10.2109 14.6681 9.70703 14.8888 9.3125 15.3302C8.92188 15.7677 8.72656 16.3439 8.72656 17.0587C8.72656 17.7618 8.91016 18.3165 9.27734 18.7228C9.64844 19.129 10.1445 19.3322 10.7656 19.3322C11.2891 19.3322 11.7812 19.1583 12.2422 18.8107V19.7247ZM16.2031 20.1407C15.3164 20.1407 14.6074 19.8615 14.0762 19.3029C13.5488 18.7404 13.2852 17.9962 13.2852 17.0704C13.2852 16.0626 13.5605 15.2755 14.1113 14.7091C14.6621 14.1427 15.4062 13.8595 16.3438 13.8595C17.2383 13.8595 17.9355 14.1349 18.4355 14.6857C18.9395 15.2365 19.1914 16.0001 19.1914 16.9767C19.1914 17.9337 18.9199 18.7013 18.377 19.2794C17.8379 19.8536 17.1133 20.1407 16.2031 20.1407ZM16.2734 14.6681C15.6562 14.6681 15.168 14.879 14.8086 15.3009C14.4492 15.7189 14.2695 16.297 14.2695 17.0353C14.2695 17.7462 14.4512 18.3068 14.8145 18.7169C15.1777 19.1271 15.6641 19.3322 16.2734 19.3322C16.8945 19.3322 17.3711 19.131 17.7031 18.7286C18.0391 18.3263 18.207 17.754 18.207 17.0118C18.207 16.2618 18.0391 15.6837 17.7031 15.2775C17.3711 14.8712 16.8945 14.6681 16.2734 14.6681ZM23.5098 19.9415C23.2832 20.0665 22.9844 20.129 22.6133 20.129C21.5625 20.129 21.0371 19.5431 21.0371 18.3712V14.8204H20.0059V14.0001H21.0371V12.5353L21.998 12.2247V14.0001H23.5098V14.8204H21.998V18.2013C21.998 18.6036 22.0664 18.8907 22.2031 19.0626C22.3398 19.2345 22.5664 19.3204 22.8828 19.3204C23.125 19.3204 23.334 19.254 23.5098 19.1212V19.9415Z" fill="black" />
									</Svg>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("i")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M15.5176 10.7148C15.2598 10.7148 15.04 10.627 14.8584 10.4512C14.6768 10.2754 14.5859 10.0527 14.5859 9.7832C14.5859 9.51367 14.6768 9.29102 14.8584 9.11523C15.04 8.93359 15.2598 8.84277 15.5176 8.84277C15.7812 8.84277 16.0039 8.93359 16.1855 9.11523C16.373 9.29102 16.4668 9.51367 16.4668 9.7832C16.4668 10.041 16.373 10.2607 16.1855 10.4424C16.0039 10.624 15.7812 10.7148 15.5176 10.7148ZM16.2207 22H14.7793V13H16.2207V22Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("\\\\infty")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M21.625 10C22.2305 10 22.7969 10.1139 23.3242 10.3418C23.8516 10.5697 24.3171 10.8822 24.7207 11.2793C25.1243 11.6764 25.4368 12.1387 25.6582 12.666C25.8796 13.1934 25.9935 13.763 26 14.375C26 14.9805 25.8861 15.5469 25.6582 16.0742C25.4303 16.6016 25.1178 17.0671 24.7207 17.4707C24.3236 17.8743 23.8613 18.1868 23.334 18.4082C22.8066 18.6296 22.237 18.7435 21.625 18.75C20.9674 18.75 20.3294 18.6296 19.7109 18.3887C19.0924 18.1478 18.5456 17.793 18.0703 17.3242C17.7188 16.9792 17.3737 16.6374 17.0352 16.2988C16.6966 15.9603 16.3516 15.612 16 15.2539L14.9746 16.2793L13.9395 17.3145C13.4707 17.7832 12.9238 18.138 12.2988 18.3789C11.6738 18.6198 11.0326 18.7435 10.375 18.75C9.76953 18.75 9.20312 18.6361 8.67578 18.4082C8.14844 18.1803 7.68294 17.8678 7.2793 17.4707C6.87565 17.0736 6.56315 16.6113 6.3418 16.084C6.12044 15.5566 6.00651 14.987 6 14.375C6 13.7695 6.11393 13.2031 6.3418 12.6758C6.56966 12.1484 6.88216 11.6829 7.2793 11.2793C7.67643 10.8757 8.13867 10.5632 8.66602 10.3418C9.19336 10.1204 9.76302 10.0065 10.375 10C11.0326 10 11.6706 10.1204 12.2891 10.3613C12.9076 10.6022 13.4544 10.957 13.9297 11.4258C14.2812 11.7708 14.6263 12.1126 14.9648 12.4512C15.3034 12.7897 15.6484 13.138 16 13.4961L17.0254 12.4707L18.0605 11.4355C18.5293 10.9668 19.0762 10.612 19.7012 10.3711C20.3262 10.1302 20.9674 10.0065 21.625 10ZM10.4336 17.4707C10.668 17.4707 10.9056 17.4479 11.1465 17.4023C11.3874 17.3568 11.6217 17.2917 11.8496 17.207C12.0775 17.1224 12.2956 17.0117 12.5039 16.875C12.7122 16.7383 12.901 16.5885 13.0703 16.4258C13.4154 16.0807 13.7539 15.7389 14.0859 15.4004C14.418 15.0618 14.7598 14.7201 15.1113 14.375L14.0859 13.3496C13.7474 13.0111 13.4056 12.666 13.0605 12.3145C12.709 11.9629 12.2956 11.6992 11.8203 11.5234C11.3451 11.3477 10.8633 11.2565 10.375 11.25C9.94531 11.25 9.54167 11.3314 9.16406 11.4941C8.78646 11.6569 8.45443 11.8783 8.16797 12.1582C7.88151 12.4382 7.6569 12.7702 7.49414 13.1543C7.33138 13.5384 7.25 13.9453 7.25 14.375C7.25 14.8242 7.33138 15.2376 7.49414 15.6152C7.6569 15.9928 7.88477 16.3184 8.17773 16.5918C8.4707 16.8652 8.80599 17.0801 9.18359 17.2363C9.5612 17.3926 9.97786 17.4707 10.4336 17.4707ZM21.5664 17.4707C22.0091 17.4707 22.4225 17.3958 22.8066 17.2461C23.1908 17.0964 23.5293 16.8815 23.8223 16.6016C24.1152 16.3216 24.3398 15.9928 24.4961 15.6152C24.6523 15.2376 24.737 14.8242 24.75 14.375C24.75 13.9258 24.6686 13.5124 24.5059 13.1348C24.3431 12.7572 24.1152 12.4316 23.8223 12.1582C23.5293 11.8848 23.194 11.6699 22.8164 11.5137C22.4388 11.3574 22.0221 11.2793 21.5664 11.2793C21.332 11.2793 21.0944 11.3021 20.8535 11.3477C20.6126 11.3932 20.3783 11.4583 20.1504 11.543C19.9225 11.6276 19.7044 11.7383 19.4961 11.875C19.2878 12.0117 19.099 12.1615 18.9297 12.3242C18.5846 12.6693 18.2461 13.0111 17.9141 13.3496C17.582 13.6882 17.2402 14.0299 16.8887 14.375L17.9141 15.4004C18.2526 15.7389 18.5944 16.084 18.9395 16.4355C19.1022 16.6048 19.2878 16.7513 19.4961 16.875C19.7044 16.9987 19.9225 17.1061 20.1504 17.1973C20.3783 17.2884 20.6126 17.3568 20.8535 17.4023C21.0944 17.4479 21.332 17.4707 21.5664 17.4707Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("log({#0})")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M8.77391 19H9.79344V10.5449H8.77391V19ZM13.9258 19.1055C15.6074 19.1055 16.7441 17.8926 16.7441 15.9531C16.7441 14.0078 15.6074 12.8008 13.9258 12.8008C12.2383 12.8008 11.1016 14.0078 11.1016 15.9531C11.1016 17.8926 12.2383 19.1055 13.9258 19.1055ZM13.9258 18.209C12.8477 18.209 12.1387 17.3887 12.1387 15.9531C12.1387 14.5176 12.8477 13.6973 13.9258 13.6973C15.0039 13.6973 15.707 14.5176 15.707 15.9531C15.707 17.3887 15.0039 18.209 13.9258 18.209ZM20.5191 21.2969C22.2007 21.2969 23.273 20.3301 23.273 18.877V12.9062H22.3003V13.9316H22.2827C21.8784 13.2227 21.1636 12.8008 20.3023 12.8008C18.7261 12.8008 17.7066 14.0195 17.7066 15.9297C17.7066 17.8223 18.7261 19.0469 20.2788 19.0469C21.1343 19.0469 21.855 18.6133 22.23 17.9512H22.2534V18.9121C22.2534 19.8203 21.6148 20.4297 20.5601 20.4297C19.7984 20.4297 19.1948 20.0605 18.9956 19.5039H17.9468C18.1167 20.541 19.1773 21.2969 20.5191 21.2969ZM20.4839 18.1504C19.4351 18.1504 18.7495 17.2949 18.7495 15.9297C18.7495 14.5645 19.4351 13.6973 20.4839 13.6973C21.5445 13.6973 22.2534 14.5879 22.2534 15.9297C22.2534 17.2715 21.5445 18.1504 20.4839 18.1504Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("\\\\log_{{#0}}({#0})")}>
									<Svg width="60" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M8.77134 18.8457H9.79087V10.3906H8.77134V18.8457ZM13.9258 18.9512C15.6074 18.9512 16.7441 17.7383 16.7441 15.7988C16.7441 13.8535 15.6074 12.6465 13.9258 12.6465C12.2383 12.6465 11.1016 13.8535 11.1016 15.7988C11.1016 17.7383 12.2383 18.9512 13.9258 18.9512ZM13.9258 18.0547C12.8477 18.0547 12.1387 17.2344 12.1387 15.7988C12.1387 14.3633 12.8477 13.543 13.9258 13.543C15.0039 13.543 15.707 14.3633 15.707 15.7988C15.707 17.2344 15.0039 18.0547 13.9258 18.0547ZM20.5216 21.1426C22.2033 21.1426 23.2755 20.1758 23.2755 18.7227V12.752H22.3029V13.7773H22.2853C21.881 13.0684 21.1662 12.6465 20.3048 12.6465C18.7287 12.6465 17.7091 13.8652 17.7091 15.7754C17.7091 17.668 18.7287 18.8926 20.2814 18.8926C21.1369 18.8926 21.8576 18.459 22.2326 17.7969H22.256V18.7578C22.256 19.666 21.6173 20.2754 20.5626 20.2754C19.8009 20.2754 19.1974 19.9062 18.9982 19.3496H17.9494C18.1193 20.3867 19.1798 21.1426 20.5216 21.1426ZM20.4865 17.9961C19.4376 17.9961 18.7521 17.1406 18.7521 15.7754C18.7521 14.4102 19.4376 13.543 20.4865 13.543C21.547 13.543 22.256 14.4336 22.256 15.7754C22.256 17.1172 21.547 17.9961 20.4865 17.9961Z" fill="#444444" />
										<Rect x="24.7839" y="20.7785" width="5.84081" height="5.84081" stroke="#767676" stroke-width="0.834403" stroke-linejoin="round" stroke-dasharray="1.67 0.5" />
									</Svg>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("\\\\pi")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M12.6602 21.0002H14.1279V13.1604H17.6699V18.8733C17.6699 20.4465 18.2852 21.0706 19.6738 21.0706C20.0342 21.0706 20.3066 21.0178 20.4561 20.9651V19.6907C20.333 19.7346 20.0869 19.761 19.9463 19.761C19.4014 19.761 19.1377 19.4709 19.1377 18.7151V13.1604H20.9658V11.8596H10.8672V13.1604H12.6602V21.0002Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("\\\\%")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M14.7999 11.4002C14.7999 11.7335 14.7374 12.0439 14.6124 12.3314C14.4874 12.6189 14.3166 12.873 14.0999 13.0939C13.8833 13.3147 13.627 13.4876 13.3312 13.6126C13.0354 13.7376 12.725 13.8001 12.4 13.8001C12.0666 13.8001 11.7562 13.7376 11.4687 13.6126C11.1812 13.4876 10.9271 13.3168 10.7062 13.1001C10.4854 12.8835 10.3125 12.6293 10.1875 12.3376C10.0625 12.046 10 11.7335 10 11.4002C10 11.071 10.0625 10.7606 10.1875 10.4689C10.3125 10.1773 10.4833 9.9231 10.7 9.70643C10.9167 9.48977 11.1708 9.31686 11.4625 9.18769C11.7541 9.05853 12.0666 8.99603 12.4 9.0002C12.7291 9.0002 13.0395 9.06269 13.3312 9.18769C13.6229 9.31269 13.877 9.48352 14.0937 9.70018C14.3103 9.91685 14.4833 10.1731 14.6124 10.4689C14.7416 10.7647 14.8041 11.0752 14.7999 11.4002ZM12.4 13.0001C12.6208 13.0001 12.827 12.9585 13.0187 12.8751C13.2104 12.7918 13.3812 12.6772 13.5312 12.5314C13.6812 12.3856 13.7958 12.2168 13.8749 12.0251C13.9541 11.8335 13.9958 11.6252 13.9999 11.4002C13.9999 11.1793 13.9583 10.9731 13.8749 10.7814C13.7916 10.5898 13.677 10.4189 13.5312 10.2689C13.3854 10.1189 13.2166 10.0043 13.025 9.92518C12.8333 9.84601 12.625 9.80435 12.4 9.80018C12.1791 9.80018 11.9729 9.84185 11.7812 9.92518C11.5896 10.0085 11.4187 10.1231 11.2687 10.2689C11.1187 10.4148 11.0042 10.5835 10.925 10.7752C10.8458 10.9668 10.8042 11.1752 10.8 11.4002C10.8 11.621 10.8417 11.8272 10.925 12.0189C11.0083 12.2106 11.1229 12.3814 11.2687 12.5314C11.4146 12.6814 11.5833 12.796 11.775 12.8751C11.9666 12.9543 12.175 12.996 12.4 13.0001ZM19.5998 16.2001C19.929 16.2001 20.2394 16.2626 20.5311 16.3876C20.8227 16.5126 21.0769 16.6834 21.2936 16.9001C21.5102 17.1167 21.6831 17.373 21.8123 17.6688C21.9415 17.9646 22.004 18.275 21.9998 18.6C21.9998 18.9334 21.9373 19.2438 21.8123 19.5313C21.6873 19.8188 21.5165 20.0729 21.2998 20.2938C21.0832 20.5146 20.8269 20.6875 20.5311 20.8125C20.2352 20.9375 19.9248 21 19.5998 21C19.2665 21 18.9561 20.9375 18.6686 20.8125C18.3811 20.6875 18.127 20.5167 17.9061 20.3C17.6853 20.0833 17.5124 19.8292 17.3874 19.5375C17.2624 19.2459 17.1999 18.9334 17.1999 18.6C17.1999 18.2709 17.2624 17.9605 17.3874 17.6688C17.5124 17.3771 17.6832 17.123 17.8999 16.9063C18.1165 16.6897 18.3707 16.5167 18.6624 16.3876C18.954 16.2584 19.2665 16.1959 19.5998 16.2001ZM19.5998 20.2C19.8207 20.2 20.0269 20.1583 20.2186 20.075C20.4102 19.9917 20.5811 19.8771 20.7311 19.7313C20.8811 19.5854 20.9957 19.4167 21.0748 19.225C21.154 19.0334 21.1957 18.825 21.1998 18.6C21.1998 18.3792 21.1582 18.173 21.0748 17.9813C20.9915 17.7896 20.8769 17.6188 20.7311 17.4688C20.5852 17.3188 20.4165 17.2042 20.2248 17.1251C20.0332 17.0459 19.8248 17.0042 19.5998 17.0001C19.379 17.0001 19.1728 17.0417 18.9811 17.1251C18.7894 17.2084 18.6186 17.323 18.4686 17.4688C18.3186 17.6146 18.204 17.7834 18.1249 17.975C18.0457 18.1667 18.004 18.375 17.9999 18.6C17.9999 18.8209 18.0415 19.0271 18.1249 19.2188C18.2082 19.4104 18.3228 19.5813 18.4686 19.7313C18.6144 19.8813 18.7832 19.9958 18.9749 20.075C19.1665 20.1542 19.3748 20.1958 19.5998 20.2ZM19.4498 9.0002L13.4499 21H12.55L18.5499 9.0002H19.4498Z" fill="black" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("ln({#0})")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M12.2112 19H13.2307V10.5449H12.2112V19ZM14.8377 19H15.8572V15.4141C15.8572 14.3828 16.4841 13.7031 17.4451 13.7031C18.3826 13.7031 18.8455 14.2422 18.8455 15.2266V19H19.865V15.0449C19.865 13.6621 19.0916 12.8008 17.7556 12.8008C16.8123 12.8008 16.1619 13.2227 15.822 13.8789H15.7986V12.9062H14.8377V19Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("a")}>
									<Text style={{ fontSize: 30, left: 25 }}>a</Text>
								</TouchableOpacity>
							</View>
							<View style={styles.keyboradColumn}>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("\\\\tau")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M16.6602 21.0701C17.0381 21.0701 17.4512 21.0173 17.6445 20.9646V19.7078C17.4688 19.7429 17.2402 19.7517 17.0029 19.7517C16.124 19.7517 15.834 19.321 15.834 18.5125V13.1599H18.9102V11.8591H11.501V13.1599H14.3047V18.5476C14.3047 20.3318 14.8848 21.0701 16.6602 21.0701Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("{#0}!")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M21.471 7.89792L21.5884 17.3241H23.1138L23.2311 7.89792H21.471ZM22.3511 22.1056C22.9867 22.1056 23.4658 21.6167 23.4658 20.9909C23.4658 20.3553 22.9867 19.8762 22.3511 19.8762C21.7253 19.8762 21.2364 20.3553 21.2364 20.9909C21.2364 21.6167 21.7253 22.1056 22.3511 22.1056Z" fill="#444444" />
										<Rect x="8.4172" y="10.4309" width="9.17841" height="9.17841" stroke="#767676" stroke-width="0.834403" stroke-linejoin="round" stroke-dasharray="1.67 0.5" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("e")}>
									<Svg width="64" height="60" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg">
										<Path d="M19.9814 17.8604H13.627C13.6504 18.8623 13.9199 19.6357 14.4355 20.1807C14.9512 20.7256 15.6602 20.998 16.5625 20.998C17.5762 20.998 18.5078 20.6641 19.3574 19.9961V21.3496C18.5664 21.9238 17.5205 22.2109 16.2197 22.2109C14.9482 22.2109 13.9492 21.8037 13.2227 20.9893C12.4961 20.1689 12.1328 19.0176 12.1328 17.5352C12.1328 16.1348 12.5283 14.9951 13.3193 14.1162C14.1162 13.2314 15.1035 12.7891 16.2812 12.7891C17.459 12.7891 18.3701 13.1699 19.0146 13.9316C19.6592 14.6934 19.9814 15.751 19.9814 17.1045V17.8604ZM18.5049 16.6387C18.499 15.8066 18.2969 15.1592 17.8984 14.6963C17.5059 14.2334 16.958 14.002 16.2549 14.002C15.5752 14.002 14.998 14.2451 14.5234 14.7314C14.0488 15.2178 13.7559 15.8535 13.6445 16.6387H18.5049Z" fill="#444444" />
									</Svg>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.keyboardBotton, { backgroundColor: 'lightgray' }]} onPress={() => inserisci("b")}>
									<Text style={{ fontSize: 30, left: 25 }}>b</Text>
								</TouchableOpacity>
							</View>
						</View>}
				</View>
			</View >
		</View>
	);
}

function SolutionScreen({ route }) {

	var [showFirstSteps, setShowFirstSteps] = useState(false);
	var [showSecondSteps, setShowSecondSteps] = useState(false);

	var solutionContainer = route?.params?.solutionContainer;

	if (solutionContainer.error) {
		return (
			<View>
				<View style={styles.card}>
					<View style={{ padding: 10 }}>
						<Text style={{ fontSize: 25, textAlign: 'center' }}>{solutionContainer.errorMessage}</Text>
					</View>
				</View>
			</View>
		)
	} else {
		return (
			<ScrollView>
				<View>
					{(solutionContainer.firstTitle == "") || (solutionContainer.firstTitle == undefined) ?
						<Text />
						: <View style={[styles.card, { marginTop: 20 }]}>
							<View>
								<View style={{ padding: 10 }}>
									<Text style={{ fontSize: 30, paddingLeft: 5 }}>{solutionContainer.firstTitle}</Text>
									<MathJax size={"200%"} html={"$" + solutionContainer.firstSolution.slice(1, -1).split("$<br/>$").join("$$") + "$"} />
								</View>
								{solutionContainer.stepFirstSolution == "" ?
									<Text />
									:
									<TouchableOpacity onPress={() => setShowFirstSteps(!showFirstSteps)} style={styles.stepsButton}>
										<AntDesign name={showFirstSteps ? "arrowdown" : "arrowup"} size={32} color="black" />
										<Text style={{ fontSize: 20, paddingLeft: 5 }}>{showFirstSteps ? solutionContainer.hideStep : solutionContainer.viewStep}</Text>
									</TouchableOpacity>
								}
								{showFirstSteps ?
									<View style={{ padding: 8 }}>
										<MathJax size={"100%"} html={solutionContainer.stepFirstSolution} />
									</View>
									:
									<View />
								}
							</View>
						</View>}
					{(solutionContainer.secondTitle == "") || (solutionContainer.secondTitle == undefined) ?
						<Text />
						:
						<View style={styles.card}>
							<View>
								<View style={{ padding: 10 }}>
									<Text style={{ fontSize: 30, paddingLeft: 5 }}>{solutionContainer.secondTitle}</Text>
									<MathJax size={"200%"} html={"$" + solutionContainer.secondSolution.slice(1, -1).split("$<br/>$").join("$$") + "$"} />
								</View>
								{solutionContainer.stepSecondSolution == "" ?
									<Text />
									:
									<TouchableOpacity onPress={() => setShowSecondSteps(!showSecondSteps)} style={styles.stepsButton}>
										<AntDesign name={showSecondSteps ? "arrowdown" : "arrowup"} size={32} color="black" />
										<Text style={{ fontSize: 20, paddingLeft: 5 }}>{showSecondSteps ? solutionContainer.hideStep : solutionContainer.viewStep}</Text>
									</TouchableOpacity>
								}
								{showSecondSteps ?
									<View style={{ padding: 8 }}>
										<MathJax size={"100%"} html={solutionContainer.stepSecondSolution} />
									</View>
									:
									<View />
								}
							</View>
						</View>
					}
					<Text />
					{solutionContainer.graphTitle == "" ?
						<Text /> :
						<View style={styles.card}>
							<Text style={{ fontSize: 30, top: 10, left: 10 }}>{solutionContainer.graphTitle}</Text>
							<VictoryChart
								domain={{ x: [solutionContainer.xMin, solutionContainer.xMax], y: [solutionContainer.yMin, solutionContainer.yMax] }}
								width={windowWidth}
								height={windowWidth}
								theme={VictoryTheme.material}
								style={{ background: { fill: "lightgrey" } }}
							>
								<VictoryLine data={solutionContainer.points} />
							</VictoryChart>
						</View>}
					<Text />
				</View>
			</ScrollView>
		)
	}
}

function HistoryScreen({ navigation }) {

	var [history, setHistory] = useState([]);

	useEffect(() => {
		getHistory()
	}, [])

	async function getHistory() {
		try {
			const value = await AsyncStorage.getItem('history');
			if (value !== null) {
				var tempContainer = [];
				var count = value.split(',').length;
				for (var i = 0; i < count - 1; i++) {
					tempContainer.push(value.split(',')[i])
				}
				setHistory(history => tempContainer);
			}
		} catch (error) {

		}
	}
	return (
		<ScrollView>
			<Text style={{ fontSize: 35, fontWeight: 'bold', left: 5, marginVertical: 5 }}>History</Text>
			{history.map((history, i) => <ObjectRow text={history} key={i} navigation={navigation} />)}
		</ScrollView>
	)
}

function ObjectRow({ text, navigation }) {

	var [hide, setHide] = useState(false);

	function copyToTheClipboard() {
		Clipboard.setString(text)
		ToastAndroid.showWithGravityAndOffset(
			"Copied",
			ToastAndroid.SHORT,
			ToastAndroid.BOTTOM,
			25,
			50
		);
	}

	async function deleteElement() {
		setHide(hide => true);
		ToastAndroid.showWithGravityAndOffset(
			"Delated",
			ToastAndroid.SHORT,
			ToastAndroid.BOTTOM,
			25,
			50
		);
		try {
			var value = await AsyncStorage.getItem('history');
			if (value !== null) {

			}
		} catch (error) {

		}
		value = value.split("," + text).join("");
		try {
			await AsyncStorage.setItem(
				'history',
				value
			);
		} catch (error) {
			alert(error)
		}
	}

	if (!hide) {
		return (
			<TouchableOpacity style={[styles.card, { flexDirection: 'row' }]} onPress={() => navigation.navigate("Home", { mathText: text })} onLongPress={() => copyToTheClipboard()}>
				<View style={{ padding: 10, width: '90%' }}>
					<MathJax size={"150%"} html={"$" + text + "$"} />
				</View>
				<TouchableOpacity style={{ justifyContent: 'center', alignContent: 'center' }} onPress={() => deleteElement()}>
					<AntDesign name="delete" size={24} color="black" />
				</TouchableOpacity>
			</TouchableOpacity>
		)
	} else {
		return (
			<View />
		)
	}

}

function WritingScreen({ navigation }) {

	const webViewRef = useRef();
	var [text, setText] = useState();
	var [refreshing, setRefrescing] = useState(false);

	useEffect(() => {
		ScreenOrientation.lockAsync(ScreenOrientation.Orientation.PORTRAIT_UP)
	}, [])

	function onMessage(data) {
		if (data.nativeEvent.data == "solve") {
			solveEquation();
			return
		}
		setText(data.nativeEvent.data);
	}

	async function solveEquation() {
		if (text.length == 0) {
			ToastAndroid.showWithGravityAndOffset(
				"Enter the Text First",
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
				25,
				50
			);
			return
		}

		var testo = text;
		setRefrescing(refreshing => true);

		var testo = testo.split("\\").join("%60");
		var testo = testo.split("%").join("%25");
		var testo = testo.split("{").join("%7B%20");
		var testo = testo.split('}').join('%20%20%7D');
		var testo = testo.split('+').join('%2B');
		var testo = testo.split("×").join("%20%60times%20%20");
		var testo = testo.split(":").join("%20%60div%20%20");
		var testo = testo.split("=").join("%20%3D%20%20");
		var testo = testo.split(">").join("%20>%20%20");
		var testo = testo.split("<").join("%20<%20%20");
		var testo = testo.split("|").join("%7C");
		var testo = testo.split(",").join(".");

		try {
			var value = await AsyncStorage.getItem('lingua');
			setLingua(lingua => value);
		} catch (error) {
			var value = "en";
		}

		var searchUrl = "https://mathapp-api-git-main-giacomo-petrioli.vercel.app/?text=" + testo + "&language=" + value;

		const controller = new AbortController();
		const timeout = setTimeout(() => {
			controller.abort();
		}, 10000);

		try {
			const response = await fetch(searchUrl, { signal: controller.signal });
			var htmlString = await response.text();
			var solutionContainer = JSON.parse(htmlString);
			setRefrescing(refreshing => false);


			navigation.navigate("Solution", { solutionContainer: solutionContainer });
		} catch (error) {
			if (error.message == "Aborted") alert("Your Internet connection is absent or too slow")
			else alert(error.message)
		} finally {
			clearTimeout(timeout);
		}
	}

	return (
		<View style={{ flex: 1 }}>
			{refreshing ?
				<Progress.Bar color='#66ccff' width={windowHeigth} animated={refreshing} indeterminate={refreshing} />
				:
				<View />
			}
			<WebView
				ref={webViewRef}
				onMessage={onMessage}
				scrollEnabled={false}
				textZoom={100}
				source={{ uri: "https://giacomo-petrioli.github.io/DrawMathRecognition/" }}
			/>
		</View>
	)
}

const Stack = createNativeStackNavigator();

function App() {
	return (
		<NavigationContainer>
			<Stack.Navigator>
				<Stack.Screen
					name="Home"
					component={HomeScreen}
					options={{ headerShown: false }}
				/>
				<Stack.Screen
					name="Solution"
					component={SolutionScreen}
				/>
				<Stack.Screen
					name="History"
					component={HistoryScreen}
				/>
				<Stack.Screen
					name="Writing"
					component={WritingScreen}
					options={{
						animation: 'none',
						title: 'Draw Math',
						headerTitleStyle: {
							fontWeight: 'bold',
							fontSize: 25
						},
					}}
				/>
			</Stack.Navigator>
		</NavigationContainer>
	);
}

const styles = StyleSheet.create({
	countContainer: {
		top: 15,
		height: 60,
	},
	card: {
		borderRadius: 6,
		elevation: 6,
		backgroundColor: '#fff',
		shadowOffset: { width: 1, height: 1 },
		shadowColor: '#333',
		shadowOpacity: 0.3,
		shadowRadius: 2,
		marginHorizontal: 8,
		marginVertical: 10,
	},
	keyboardContainer: {
		backgroundColor: "#ededed",
		padding: 1,
		flexDirection: 'row'
	},
	keyboradColumn: {
		width: windowWidth / 6,
		paddingVertical: 5
	},
	keyboardBotton: {
		margin: 1,
		width: windowWidth / 6 - 4,
		minHeight: 85,
		borderRadius: 5,
		justifyContent: 'center',
		marginTop: 2
	},
	toolbar: {
		width: windowWidth,
		backgroundColor: "#ededed",
		flexDirection: 'row',
		height: 75
	},
	toolbarButton: {
		width: windowWidth / 6,
		justifyContent: 'center',
	},
	stepsButton: {
		backgroundColor: '#147f8f',
		height: 50,
		borderBottomLeftRadius: 6,
		borderBottomRightRadius: 6,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	settingItem: {
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
		height: 45,
		flexDirection: 'row',
		alignItems: 'center'
	},
	settingSeparator: {
		height: 30,
		backgroundColor: '#ededed'
	},
	settingText: {
		fontSize: 22,
		marginLeft: 10,
		fontWeight: 'bold',
	}
});

export default App;