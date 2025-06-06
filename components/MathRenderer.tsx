import React, { useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

interface MathRendererProps {
  latex: string;
  style?: ViewStyle;
  fontSize?: number;
  color?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({
  latex,
  style,
  fontSize = 24,
  color = '#333'
}) => {
  const [hasError, setHasError] = useState(false);
  // Convert plain text math to LaTeX if needed
  const formatLatex = (text: string): string => {
    let formatted = text.trim();

    // Convert common patterns to LaTeX
    formatted = formatted.replace(/\^([0-9]+)/g, '^{$1}'); // x^2 -> x^{2}
    formatted = formatted.replace(/\^([a-zA-Z]+)/g, '^{$1}'); // x^n -> x^{n}
    formatted = formatted.replace(/([0-9]+)x/g, '$1x'); // 2x stays 2x
    formatted = formatted.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}'); // sqrt(x) -> \sqrt{x}
    formatted = formatted.replace(/\*\*/g, '^'); // ** -> ^

    return formatted;
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
      <style>
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 8px;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: transparent;
          overflow: hidden;
        }
        .math-container {
          font-size: ${fontSize}px;
          color: ${color};
          text-align: center;
          line-height: 1.2;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
        }
        .katex {
          font-size: inherit !important;
        }
        .katex-display {
          margin: 0 !important;
        }
      </style>
    </head>
    <body>
      <div class="math-container" id="math">${formatLatex(latex)}</div>
      <script>
        function renderMath() {
          try {
            katex.render("${formatLatex(latex).replace(/"/g, '\\"')}", document.getElementById("math"), {
              throwOnError: false,
              displayMode: true
            });
          } catch (e) {
            console.error("Math rendering error:", e);
            document.getElementById("math").innerHTML = "${latex.replace(/"/g, '\\"')}";
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

  // Show fallback text if WebView has issues
  if (hasError) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.fallbackText, { fontSize, color }]}>
          {latex}
        </Text>
      </View>
    );
  }

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
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          setHasError(true);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView http error: ', nativeEvent);
          setHasError(true);
        }}
        onLoadEnd={() => {
          // Successfully loaded
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
  fallbackText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default MathRenderer;
