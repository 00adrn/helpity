export type PresetLevel = "elementary" | "middle" | "high";

export type Preset = {
  title: string;
  level: PresetLevel;
  sharedText: string;
};

export const presets = {
  foobar: {
    title: "FooBar",
    level: "elementary",
    sharedText: `// Combine two words and print the result.
function foobar() {
  let foo = "Foo";
  let bar = "bar";

  // TODO: Combine foo and bar to print "Foobar".
  // HINT: You can join strings with +.
}

foobar();`,
  },

  greet: {
    title: "Say Hello",
    level: "elementary",
    sharedText: `// Greet someone using their name.
function greet(name) {
  // TODO: Print "Hello, Ada!" when name is "Ada".
  // HINT: Join "Hello, " and name with +.
}

greet("Ada");`,
  },

  doubleNumber: {
    title: "Double a Number",
    level: "elementary",
    sharedText: `// Return a number that is twice the input.
function doubleNumber(number) {
  // TODO: Return number multiplied by 2.
}

console.log(doubleNumber(4));`,
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
  },
} as const satisfies Record<string, Preset>;

export type PresetId = keyof typeof presets;

/** Check a session creation request against the known preset IDs. */
export function isPresetId(value: unknown): value is PresetId {
  return typeof value === "string" && Object.hasOwn(presets, value);
}
