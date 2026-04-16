import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, KeyboardAvoidingView, Platform, Keyboard, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { chatAPI, BASE_URL } from '../lib/api';

interface Msg {
  id: string;
  isBot: boolean;
  text: string;
  error?: boolean;
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AIChatModal({ visible, onClose }: AIChatModalProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const slideAnim = useRef(new Animated.Value(1000)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      if (messages.length === 0) {
        setMessages([
          {
            id: 'init',
            isBot: true,
            text: 'Hi! I am the GigShield AI Assistant. Ask me anything about your policies or claims!\n\nTip: Type "research" to enable deep analysis mode 🔍',
          },
        ]);
      }
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 1000,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    // Check for research mode toggle
    const msg = inputText.trim();
    if (msg.toLowerCase() === 'research' || msg.toLowerCase() === 'deep research') {
      const newMode = !deepResearch;
      setDeepResearch(newMode);
      setInputText('');
      const modeMsg: Msg = {
        id: Date.now().toString(),
        isBot: true,
        text: newMode
          ? '🔍 Deep Research Mode Enabled! I can now provide comprehensive analysis.\nTry asking: "Analyze my claims" or "How can I optimize my coverage?"'
          : '📋 Normal Mode Enabled. I\'ll provide quick, conversational answers.',
      };
      setMessages((prev) => [...prev, modeMsg]);
      return;
    }

    const userMsg: Msg = { id: Date.now().toString(), isBot: false, text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      console.log(
        `[Chat] Sending message to ${BASE_URL}/api/chat/ (Deep Research: ${deepResearch})`
      );
      const res = await chatAPI.sendMessage(msg, deepResearch);
      const botMsg: Msg = {
        id: (Date.now() + 1).toString(),
        isBot: true,
        text: res.data.reply,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('[Chat] API Error:', {
        message: err.message || 'Unknown error',
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        code: err.code,
      });

      let errorText = "I'm having trouble connecting right now.";

      // Provide more specific error messages
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        errorText =
          '🌐 Network Error: Cannot reach the backend. Please ensure:\n1. Backend is running at ' +
          BASE_URL +
          '\n2. Your internet connection is active';
      } else if (err.response?.status === 401) {
        errorText =
          '🔐 Authentication Error: Your session expired. Please log in again.';
      } else if (err.response?.status === 403) {
        errorText =
          '🔑 API Key Error: Backend is misconfigured. Check GEMINI_API_KEY.';
      } else if (err.response?.status === 500) {
        errorText =
          '⚠️ Server Error: Backend error occurred. Check server logs.';
      } else if (err.message?.includes('timeout')) {
        errorText =
          '⏱️ Timeout Error: Request took too long. Please try again.';
      }

      const errorMsg: Msg = {
        id: (Date.now() + 1).toString(),
        isBot: true,
        text: errorText,
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableOpacity>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Ionicons name="sparkles" size={20} color={Colors.orange} />
              <Text style={styles.headerText}>GigShield AI</Text>
              {deepResearch && (
                <Text style={styles.researchBadge}>Research</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m) => (
              <View
                key={m.id}
                style={[styles.messageRow, m.isBot ? styles.botRow : styles.userRow]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    m.isBot
                      ? [styles.botBubble, m.error && styles.errorBubble]
                      : styles.userBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      m.isBot ? styles.botText : styles.userText,
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>
              </View>
            ))}
            {loading && (
              <View style={[styles.messageRow, styles.botRow]}>
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <Text style={[styles.messageText, styles.botText]}>
                    Typing...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Ask about your coverage..."
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || loading) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || loading}
            >
              <Ionicons name="send" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
    backgroundColor: Colors.navyCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.navyBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyBorder,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  researchBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    backgroundColor: Colors.orange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: Colors.indigo,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: Colors.navyBorder,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: Colors.indigo,
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: Colors.white,
  },
  botText: {
    color: Colors.textPrimary,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: Colors.navyBorder,
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: Colors.bgDark,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.navyBorder,
  },
});
