export type PresetLevel = "blank" | "elementary" | "middle" | "high";

export type TestValue = string | number | boolean | null | readonly TestValue[];

export type PresetTestCase = {
  name: string;
  functionName: string;
  args: readonly TestValue[];
} & (
  | { kind: "return"; expected: TestValue }
  | { kind: "output"; expected: readonly string[] }
);

export type Preset = {
  title: string;
  level: PresetLevel;
  sharedText: string;
  tests: readonly PresetTestCase[];
};

export const presets = {
  blank: {
    title: "Blank file",
    level: "blank",
    sharedText: "",
    tests: [],
  },

  foobar: {
    title: "FooBar",
    level: "elementary",
    sharedText: `// Combine two words and print the result.
function foobar(foo, bar) {
  // TODO: Combine foo and bar, then print the result.
  // HINT: You can join strings with +.
}

foobar("Foo", "bar");`,
    tests: [
      { name: "Foo + bar", functionName: "foobar", args: ["Foo", "bar"], kind: "output", expected: ["Foobar"] },
      { name: "Code + Lab", functionName: "foobar", args: ["Code", "Lab"], kind: "output", expected: ["CodeLab"] },
      { name: "Hi + !", functionName: "foobar", args: ["Hi", "!"], kind: "output", expected: ["Hi!"] },
    ],
  },

  greet: {
    title: "Say Hello",
    level: "elementary",
    sharedText: `// Greet someone using their name.
function greet(name) {
  // TODO: Print "Hello, " followed by the name and "!".
  // HINT: Join "Hello, " and name with +.
}

greet("Ada");`,
    tests: [
      { name: "Greet Ada", functionName: "greet", args: ["Ada"], kind: "output", expected: ["Hello, Ada!"] },
      { name: "Greet Sam", functionName: "greet", args: ["Sam"], kind: "output", expected: ["Hello, Sam!"] },
      { name: "Greet an empty name", functionName: "greet", args: [""], kind: "output", expected: ["Hello, !"] },
    ],
  },

  doubleNumber: {
    title: "Double a Number",
    level: "elementary",
    sharedText: `// Return a number that is twice the input.
function doubleNumber(number) {
  // TODO: Return number multiplied by 2.
}

console.log(doubleNumber(4));`,
    tests: [
      { name: "Double 4", functionName: "doubleNumber", args: [4], kind: "return", expected: 8 },
      { name: "Double 0", functionName: "doubleNumber", args: [0], kind: "return", expected: 0 },
      { name: "Double -3", functionName: "doubleNumber", args: [-3], kind: "return", expected: -6 },
    ],
  },

  fizzbuzz: {
    title: "FizzBuzz",
    level: "middle",
    sharedText: `// Print the numbers from 1 to max with Fizz and Buzz substitutions.
function fizzbuzz(max) {
  for (let num = 1; num <= max; num += 1) {
    // TODO: Print Fizz for multiples of 3, Buzz for multiples of 5,
    // or FizzBuzz for multiples of both. Otherwise, print num.
    // HINT: Use console.log() and the % operator.
  }
}

fizzbuzz(15);`,
    tests: [
      { name: "Count to 1", functionName: "fizzbuzz", args: [1], kind: "output", expected: ["1"] },
      { name: "Fizz and Buzz through 5", functionName: "fizzbuzz", args: [5], kind: "output", expected: ["1", "2", "Fizz", "4", "Buzz"] },
      { name: "FizzBuzz at 15", functionName: "fizzbuzz", args: [15], kind: "output", expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"] },
    ],
  },

  sumArray: {
    title: "Sum an Array",
    level: "middle",
    sharedText: `// Add up every number in an array.
function sumArray(numbers) {
  let total = 0;

  for (const number of numbers) {
    // TODO: Add number to total.
  }

  return total;
}

console.log(sumArray([2, 4, 6]));`,
    tests: [
      { name: "Add 2, 4, 6", functionName: "sumArray", args: [[2, 4, 6]], kind: "return", expected: 12 },
      { name: "Empty array", functionName: "sumArray", args: [[]], kind: "return", expected: 0 },
      { name: "Include negatives", functionName: "sumArray", args: [[-2, 5, -1]], kind: "return", expected: 2 },
    ],
  },

  reverseString: {
    title: "Reverse a String",
    level: "middle",
    sharedText: `// Return the characters of a string in reverse order.
function reverseString(text) {
  let reversed = "";

  for (let index = text.length - 1; index >= 0; index -= 1) {
    // TODO: Add text[index] to reversed.
  }

  return reversed;
}

console.log(reverseString("hello"));`,
    tests: [
      { name: "Reverse hello", functionName: "reverseString", args: ["hello"], kind: "return", expected: "olleh" },
      { name: "Empty string", functionName: "reverseString", args: [""], kind: "return", expected: "" },
      { name: "One letter", functionName: "reverseString", args: ["a"], kind: "return", expected: "a" },
      { name: "Palindrome", functionName: "reverseString", args: ["racecar"], kind: "return", expected: "racecar" },
    ],
  },

  isPrime: {
    title: "Check for a Prime Number",
    level: "high",
    sharedText: `// Return true only when number has no divisors other than 1 and itself.
function isPrime(number) {
  if (number < 2) return false;

  // TODO: Check whether any number from 2 through the square root divides number.
  // HINT: A divisor divides evenly when number % divisor === 0.
  return true;
}

console.log(isPrime(17));`,
    tests: [
      { name: "2 is prime", functionName: "isPrime", args: [2], kind: "return", expected: true },
      { name: "17 is prime", functionName: "isPrime", args: [17], kind: "return", expected: true },
      { name: "9 is a square", functionName: "isPrime", args: [9], kind: "return", expected: false },
      { name: "21 is composite", functionName: "isPrime", args: [21], kind: "return", expected: false },
      { name: "1 is not prime", functionName: "isPrime", args: [1], kind: "return", expected: false },
    ],
  },

  binarySearch: {
    title: "Binary Search",
    level: "high",
    sharedText: `// Find a target in a sorted array and return its index, or -1 if absent.
function binarySearch(sortedNumbers, target) {
  let left = 0;
  let right = sortedNumbers.length - 1;

  // TODO: Repeatedly check the middle index between left and right.
  // HINT: Discard the half that cannot contain target after each check.
  return -1;
}

console.log(binarySearch([1, 3, 5, 7, 9], 7));`,
    tests: [
      { name: "Find 7", functionName: "binarySearch", args: [[1, 3, 5, 7, 9], 7], kind: "return", expected: 3 },
      { name: "Find first", functionName: "binarySearch", args: [[1, 3, 5, 7, 9], 1], kind: "return", expected: 0 },
      { name: "Find last", functionName: "binarySearch", args: [[1, 3, 5, 7, 9], 9], kind: "return", expected: 4 },
      { name: "Missing target", functionName: "binarySearch", args: [[1, 3, 5, 7, 9], 4], kind: "return", expected: -1 },
      { name: "Empty array", functionName: "binarySearch", args: [[], 4], kind: "return", expected: -1 },
    ],
  },
} as const satisfies Record<string, Preset>;

export type PresetId = keyof typeof presets;

/** Check a session creation request against the known preset IDs. */
export function isPresetId(value: unknown): value is PresetId {
  return typeof value === "string" && Object.hasOwn(presets, value);
}
