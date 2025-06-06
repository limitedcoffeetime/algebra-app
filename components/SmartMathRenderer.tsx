import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import SimpleMathRenderer from './SimpleMathRenderer';

interface SmartMathRendererProps {
  text: string;
  style?: ViewStyle;
  fontSize?: number;
  color?: string;
}

const SmartMathRenderer: React.FC<SmartMathRendererProps> = ({
  text,
  style,
  fontSize = 24,
  color = '#333'
}) => {
  const [useWebView, setUseWebView] = useState(true);
  const [webViewError, setWebViewError] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // Clear timeout on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Detect if text needs advanced LaTeX rendering
  const needsLatexRendering = (input: string): boolean => {
    return /\\frac|\\sqrt|\\[a-zA-Z]+\{|_{[^}]+}|\^{[^}]+}/.test(input);
  };

  // If it's simple math or WebView failed, use SimpleMathRenderer
  if (!needsLatexRendering(text) || webViewError || !useWebView) {
    return (
      <SimpleMathRenderer
        text={text}
        style={style}
        fontSize={fontSize}
        color={color}
      />
    );
  }

  // For complex LaTeX, use WebView
  const formatLatex = (input: string): string => {
    let formatted = input.trim();

    // Ensure proper LaTeX formatting
    formatted = formatted.replace(/\^([0-9]+)/g, '^{$1}');
    formatted = formatted.replace(/\^([a-zA-Z]+)/g, '^{$1}');

    return formatted;
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: transparent;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .math-container {
          font-size: ${fontSize}px;
          color: ${color};
          text-align: center;
          line-height: 1.2;
        }
        .katex { font-size: inherit !important; }
        .katex-display { margin: 0 !important; }
      </style>
    </head>
    <body>
      <div class="math-container" id="math">${formatLatex(text)}</div>
      <script>
        function renderMath() {
          try {
            const mathElement = document.getElementById("math");
            katex.render("${formatLatex(text).replace(/"/g, '\\"')}", mathElement, {
              throwOnError: false,
              displayMode: true,
              strict: false
            });
          } catch (e) {
            console.error("KaTeX error:", e);
            document.getElementById("math").innerHTML = "${text.replace(/"/g, '\\"')}";
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', renderMath);
        } else {
          renderMath();
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        originWhitelist={['*']}
        onError={() => {
          setWebViewError(true);
        }}
        onHttpError={() => {
          setWebViewError(true);
        }}
        onLoadEnd={() => {
          // Successfully loaded - clear any pending timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }}
        // Timeout fallback
        onLoadStart={() => {
          // Clear any existing timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // Set a new timeout for fallback
          timeoutRef.current = setTimeout(() => {
            // If loading takes too long, fall back to SimpleMathRenderer
            setUseWebView(false);
            timeoutRef.current = null;
          }, 3000);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    width: '100%',
  },
  webview: {
    height: 60,
    width: '100%',
    backgroundColor: 'transparent',
  },
});

export default SmartMathRenderer;
