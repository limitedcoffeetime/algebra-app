# Math Rendering Solutions for React Native - Research Report

## Current Implementation Analysis

After examining your codebase, I found that math problems are currently displayed using plain text formatting:

**Current Approach:**
- Problems are stored as plain text strings (e.g., `"2x + 5 = 15"`, `"x^2 - 4 = 0"`)
- Displayed using React Native's `Text` component with no mathematical formatting
- Uses basic ASCII notation: `^` for exponents, `/` for division, parentheses for grouping

**Current Problems:**
- No proper mathematical typography (fractions, superscripts, square roots)
- Poor readability for complex expressions
- Inconsistent with standard mathematical notation

## Existing Solutions Research

### 1. WebView-Based Solutions (What You Want to Avoid)

#### react-native-katex
- **Pros:** Full LaTeX support, excellent rendering quality
- **Cons:** Uses WebView (exactly what you want to avoid)
- **Status:** Active, well-maintained

#### react-native-math (Android only)
- **Pros:** Native rendering using KaTeX for Android
- **Cons:** Android only, still uses WebView internally on some platforms
- **Status:** Limited maintenance

### 2. Non-WebView Solutions

#### react-native-math-view (⚠️ ARCHIVED)
- **Pros:** No WebView, uses SVG rendering via react-native-svg
- **Cons:** Project is archived (September 2024), no longer maintained
- **Implementation:** Uses MathJax compiled to SVG, then renders via react-native-svg
- **Performance:** Slower than native but faster than WebView

#### react-native-svg + Custom Implementation
- **Pros:** Full control, lightweight, platform-independent
- **Cons:** Requires building everything from scratch
- **Feasibility:** High for basic algebra, challenging for complex math

## Custom Solution Analysis

### Scope Assessment
Your use case is actually quite favorable for a custom solution:

✅ **Simple Math Only:** Linear equations, basic quadratics, polynomial simplification
✅ **No Calculus:** No derivatives, integrals, limits, etc.
✅ **Limited Symbols:** Mostly +, -, ×, ÷, ^, =, parentheses, variables
✅ **Educational Focus:** Clean, readable display more important than research-level complexity

### What You'd Need to Build

#### Core Components (using react-native-svg):
1. **Text Renderer:** Basic alphanumeric characters
2. **Superscript/Subscript:** For exponents (x², x₁)
3. **Fraction Renderer:** Horizontal lines with numerator/denominator
4. **Square Root Renderer:** √ symbol with overline
5. **Parentheses:** Scalable brackets
6. **Operators:** +, -, ×, ÷, = with proper spacing

#### Mathematical Typography Rules:
- Proper spacing around operators
- Italicized variables (x, y) vs upright numbers (2, 3)
- Superscript positioning and sizing
- Fraction line positioning and width
- Baseline alignment

### Implementation Strategy

#### Phase 1: Parser
```typescript
interface MathExpression {
  type: 'variable' | 'number' | 'operator' | 'fraction' | 'power' | 'sqrt' | 'group';
  value?: string;
  children?: MathExpression[];
  numerator?: MathExpression;
  denominator?: MathExpression;
  base?: MathExpression;
  exponent?: MathExpression;
}
```

#### Phase 2: Layout Engine
- Calculate dimensions for each component
- Handle baseline alignment
- Manage horizontal and vertical spacing
- Responsive sizing based on container

#### Phase 3: SVG Renderer
- Convert parsed expressions to SVG elements
- Use react-native-svg for cross-platform compatibility
- Implement proper mathematical typography

### Estimated Development Timeline

**Basic Implementation (covers 80% of your use cases):**
- **Week 1-2:** Parser for basic expressions (linear equations, simple powers)
- **Week 3-4:** SVG rendering for text, superscripts, basic operators
- **Week 5-6:** Fractions and square roots
- **Week 7-8:** Polish, spacing, typography refinements

**Advanced Features:**
- **Week 9-10:** Complex expressions, nested fractions
- **Week 11-12:** Performance optimization, caching
- **Week 13-14:** Edge cases, error handling

### Technical Challenges

#### 1. Typography and Spacing
- Mathematical spacing rules are complex
- Font metrics vary across platforms
- Baseline alignment requires careful calculation

#### 2. Performance
- SVG rendering can be slower than native text
- Complex expressions may need optimization
- Caching rendered expressions could help

#### 3. Parsing Complexity
- Need to handle operator precedence correctly
- Parentheses grouping
- Implicit multiplication (2x vs 2*x)

### Recommended Approach

#### Option 1: Build Custom (Recommended)
**Pros:**
- Perfect fit for your simple algebra use case
- Full control over appearance and performance
- No external dependencies on archived projects
- Educational value in building it

**Cons:**
- Significant development time (2-3 months)
- Need to handle typography details
- Ongoing maintenance burden

#### Option 2: Fork react-native-math-view
**Pros:**
- Existing codebase to build on
- Already handles complex mathematical typography
- SVG-based, no WebView

**Cons:**
- Project is archived, community support lacking
- Codebase may be overly complex for your needs
- Built for full LaTeX support, not simple algebra

#### Option 3: Hybrid Approach
**Pros:**
- Start with basic custom implementation
- Use react-native-math-view as reference
- Gradually build up capabilities

**Cons:**
- May end up recreating most of react-native-math-view

## Sample Implementation Preview

Here's what a basic custom renderer might look like:

```typescript
// Parser
function parseExpression(input: string): MathExpression {
  // Handle: "2x + 3 = 7"
  // Return parsed AST
}

// Renderer
function MathRenderer({ expression }: { expression: string }) {
  const parsed = parseExpression(expression);
  return (
    <Svg height="40" width="200">
      {renderMathAST(parsed)}
    </Svg>
  );
}

// Usage in your ProblemContainer
<MathRenderer expression={problem.equation} />
```

## Conclusion

**Recommendation:** Build a custom solution.

Your use case is actually ideal for a custom implementation because:
1. You only need basic algebra (no complex mathematical symbols)
2. You want full control over appearance
3. You're avoiding WebView for good reasons (performance, bundle size)
4. react-native-math-view is archived and may not receive security updates

The development effort is significant but manageable for a focused algebra renderer. You'd end up with a lightweight, performant solution perfectly tailored to your educational app's needs.

Start with the most common expressions in your problem set and gradually expand the parser and renderer capabilities.