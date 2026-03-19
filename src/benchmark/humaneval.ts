// ── HumanEval Task Interface ────────────────────────────────────────

export interface HumanEvalTask {
  task_id: string;
  prompt: string;
  entry_point: string;
}

// ── 50 Real HumanEval Tasks (from OpenAI HumanEval dataset) ────────

export const TASKS: HumanEvalTask[] = [
  {
    task_id: 'HumanEval/0',
    prompt: `from typing import List\n\ndef has_close_elements(numbers: List[float], threshold: float) -> bool:\n    \"\"\"Check if in given list of numbers, are any two numbers closer to each other than\n    given threshold.\n    >>> has_close_elements([1.0, 2.0, 3.0], 0.5)\n    False\n    >>> has_close_elements([1.0, 2.8, 3.0, 4.0, 5.0, 2.0], 0.3)\n    True\n    \"\"\"\n`,
    entry_point: 'has_close_elements',
  },
  {
    task_id: 'HumanEval/1',
    prompt: `from typing import List\n\ndef separate_paren_groups(paren_string: str) -> List[str]:\n    \"\"\"Input to this function is a string containing multiple groups of nested parentheses. Your goal is to\n    separate those group into separate strings and return the list of those.\n    Separate groups are balanced (each open brace is properly closed) and not nested within each other\n    Ignore any spaces in the input string.\n    >>> separate_paren_groups('( ) (( )) (( )( ))')\n    ['()', '(())', '(()())']\n    \"\"\"\n`,
    entry_point: 'separate_paren_groups',
  },
  {
    task_id: 'HumanEval/2',
    prompt: `def truncate_number(number: float) -> float:\n    \"\"\"Given a positive floating point number, it can be decomposed into\n    and integer part (largest integer smaller than given number) and decimals\n    (leftover part always smaller than 1).\n    Return the decimal part of the number.\n    >>> truncate_number(3.5)\n    0.5\n    \"\"\"\n`,
    entry_point: 'truncate_number',
  },
  {
    task_id: 'HumanEval/3',
    prompt: `from typing import List\n\ndef below_zero(operations: List[int]) -> bool:\n    \"\"\"You're given a list of deposit and withdrawal operations on a bank account that starts with\n    zero balance. Your task is to detect if at any point the balance of account falls below zero, and\n    at that point function should return True. Otherwise it should return False.\n    >>> below_zero([1, 2, 3])\n    False\n    >>> below_zero([1, 2, -4, 5])\n    True\n    \"\"\"\n`,
    entry_point: 'below_zero',
  },
  {
    task_id: 'HumanEval/4',
    prompt: `from typing import List\n\ndef mean_absolute_deviation(numbers: List[float]) -> float:\n    \"\"\"For a given list of input numbers, calculate Mean Absolute Deviation\n    around the mean of this dataset.\n    Mean Absolute Deviation is the average absolute difference between each\n    element and a centerpoint (mean in this case):\n    MAD = average | x - x_mean |\n    >>> mean_absolute_deviation([1.0, 2.0, 3.0, 4.0])\n    1.0\n    \"\"\"\n`,
    entry_point: 'mean_absolute_deviation',
  },
  {
    task_id: 'HumanEval/5',
    prompt: 'from typing import List\n\ndef intersperse(numbers: List[int], delimeter: int) -> List[int]:\n    \"\"\"Insert a number \'delimeter\' between every two consecutive elements of input list `numbers`\n    >>> intersperse([], 4)\n    []\n    >>> intersperse([1, 2, 3], 4)\n    [1, 4, 2, 4, 3]\n    \"\"\"\n',
    entry_point: 'intersperse',
  },
  {
    task_id: 'HumanEval/6',
    prompt: `from typing import List\n\ndef parse_nested_parens(paren_string: str) -> List[int]:\n    \"\"\"Input to this function is a string represented multiple groups for nested parentheses separated by spaces.\n    For each of the group, output the deepest level of nesting of parentheses.\n    E.g. (()()) has maximum two levels of nesting while ((())) has three.\n    >>> parse_nested_parens('(()()) ((())) () ((())()())')\n    [2, 3, 1, 3]\n    \"\"\"\n`,
    entry_point: 'parse_nested_parens',
  },
  {
    task_id: 'HumanEval/7',
    prompt: `from typing import List\n\ndef filter_by_substring(strings: List[str], substring: str) -> List[str]:\n    \"\"\"Filter an input list of strings only for ones that contain given substring\n    >>> filter_by_substring([], 'a')\n    []\n    >>> filter_by_substring(['abc', 'bacd', 'cde', 'array'], 'a')\n    ['abc', 'bacd', 'array']\n    \"\"\"\n`,
    entry_point: 'filter_by_substring',
  },
  {
    task_id: 'HumanEval/8',
    prompt: `from typing import List, Tuple\n\ndef sum_product(numbers: List[int]) -> Tuple[int, int]:\n    \"\"\"For a given list of integers, return a tuple consisting of a sum and a product of all the integers in a list.\n    Empty sum should be equal to 0 and empty product should be equal to 1.\n    >>> sum_product([])\n    (0, 1)\n    >>> sum_product([1, 2, 3, 4])\n    (10, 24)\n    \"\"\"\n`,
    entry_point: 'sum_product',
  },
  {
    task_id: 'HumanEval/9',
    prompt: `from typing import List, Tuple\n\ndef rolling_max(numbers: List[int]) -> List[int]:\n    \"\"\"From a given list of integers, generate a list of rolling maximum element found until given moment\n    in the sequence.\n    >>> rolling_max([1, 2, 3, 2, 3, 4, 2])\n    [1, 2, 3, 3, 3, 4, 4]\n    \"\"\"\n`,
    entry_point: 'rolling_max',
  },
  {
    task_id: 'HumanEval/10',
    prompt: `def is_palindrome(string: str) -> bool:\n    return string == string[::-1]\n\ndef make_palindrome(string: str) -> str:\n    \"\"\"Find the shortest palindrome that begins with a supplied string.\n    Algorithm idea is simple:\n    - Find the longest postfix of supplied string that is a palindrome.\n    - Append to the end of the string reverse of a string prefix that comes before the palindromic suffix.\n    >>> make_palindrome('')\n    ''\n    >>> make_palindrome('cat')\n    'catac'\n    >>> make_palindrome('cata')\n    'catac'\n    \"\"\"\n`,
    entry_point: 'make_palindrome',
  },
  {
    task_id: 'HumanEval/11',
    prompt: `from typing import List\n\ndef string_xor(a: str, b: str) -> str:\n    \"\"\"Input are two strings a and b consisting only of 1s and 0s.\n    Perform binary XOR on these inputs and return result also as a string.\n    >>> string_xor('010', '110')\n    '100'\n    \"\"\"\n`,
    entry_point: 'string_xor',
  },
  {
    task_id: 'HumanEval/12',
    prompt: `from typing import List, Optional\n\ndef longest(strings: List[str]) -> Optional[str]:\n    \"\"\"Out of list of strings, return the longest one. Return the first one in case of multiple\n    strings of the same length. Return None in case the input list is empty.\n    >>> longest([])\n    >>> longest(['a', 'b', 'c'])\n    'a'\n    >>> longest(['a', 'bb', 'ccc'])\n    'ccc'\n    \"\"\"\n`,
    entry_point: 'longest',
  },
  {
    task_id: 'HumanEval/13',
    prompt: `def greatest_common_divisor(a: int, b: int) -> int:\n    \"\"\"Return a greatest common divisor of two integers a and b\n    >>> greatest_common_divisor(3, 5)\n    1\n    >>> greatest_common_divisor(25, 15)\n    5\n    \"\"\"\n`,
    entry_point: 'greatest_common_divisor',
  },
  {
    task_id: 'HumanEval/14',
    prompt: `from typing import List\n\ndef all_prefixes(string: str) -> List[str]:\n    \"\"\"Return list of all prefixes from shortest to longest of the input string\n    >>> all_prefixes('abc')\n    ['a', 'ab', 'abc']\n    \"\"\"\n`,
    entry_point: 'all_prefixes',
  },
  {
    task_id: 'HumanEval/15',
    prompt: `def string_sequence(n: int) -> str:\n    \"\"\"Return a string containing space-delimited numbers starting from 0 upto n inclusive.\n    >>> string_sequence(0)\n    '0'\n    >>> string_sequence(5)\n    '0 1 2 3 4 5'\n    \"\"\"\n`,
    entry_point: 'string_sequence',
  },
  {
    task_id: 'HumanEval/16',
    prompt: `def count_distinct_characters(string: str) -> int:\n    \"\"\"Given a string, find out how many distinct characters (regardless of case) does it consist of\n    >>> count_distinct_characters('xyzXYZ')\n    3\n    >>> count_distinct_characters('Jerry')\n    4\n    \"\"\"\n`,
    entry_point: 'count_distinct_characters',
  },
  {
    task_id: 'HumanEval/17',
    prompt: `from typing import List\n\ndef parse_music(music_string: str) -> List[int]:\n    \"\"\"Input to this function is a string representing musical notes in a special ASCII format.\n    Your task is to parse this string and return list of integers corresponding to how many beats does each\n    not last.\n    Here is a legend:\n    'o' - whole note, lasts four beats\n    'o|' - half note, lasts two beats\n    '.|' - quarter note, lasts one beat\n    >>> parse_music('o o| .| o| o| .| .| .| .| o o')\n    [4, 2, 1, 2, 2, 1, 1, 1, 1, 4, 4]\n    \"\"\"\n`,
    entry_point: 'parse_music',
  },
  {
    task_id: 'HumanEval/18',
    prompt: `def how_many_times(string: str, substring: str) -> int:\n    \"\"\"Find how many times a given substring can be found in the original string. Count overlapping cases.\n    >>> how_many_times('', 'a')\n    0\n    >>> how_many_times('aaa', 'a')\n    3\n    >>> how_many_times('aaaa', 'aa')\n    3\n    \"\"\"\n`,
    entry_point: 'how_many_times',
  },
  {
    task_id: 'HumanEval/19',
    prompt: `from typing import List\n\ndef sort_numbers(numbers: str) -> str:\n    \"\"\"Input is a space-delimited string of numberals from 'zero' to 'nine'.\n    Valid choices are 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight' and 'nine'.\n    Return the string with numbers sorted from smallest to largest\n    >>> sort_numbers('three one five')\n    'one three five'\n    \"\"\"\n`,
    entry_point: 'sort_numbers',
  },
  {
    task_id: 'HumanEval/20',
    prompt: `from typing import List, Tuple\n\ndef find_closest_elements(numbers: List[float]) -> Tuple[float, float]:\n    \"\"\"From a supplied list of numbers (of length at least two) select and return two that are the closest to each\n    other and return them in order (smaller number, larger number).\n    >>> find_closest_elements([1.0, 2.0, 3.0, 4.0, 5.0, 2.2])\n    (2.0, 2.2)\n    >>> find_closest_elements([1.0, 2.0, 3.0, 4.0, 5.0, 2.0])\n    (2.0, 2.0)\n    \"\"\"\n`,
    entry_point: 'find_closest_elements',
  },
  {
    task_id: 'HumanEval/21',
    prompt: `from typing import List\n\ndef rescale_to_unit(numbers: List[float]) -> List[float]:\n    \"\"\"Given list of numbers (of at least two elements), apply a linear transform to that list,\n    such that the smallest number will become 0 and the largest will become 1\n    >>> rescale_to_unit([1.0, 2.0, 3.0, 4.0, 5.0])\n    [0.0, 0.25, 0.5, 0.75, 1.0]\n    \"\"\"\n`,
    entry_point: 'rescale_to_unit',
  },
  {
    task_id: 'HumanEval/22',
    prompt: `from typing import List, Any\n\ndef filter_integers(values: List[Any]) -> List[int]:\n    \"\"\"Filter given list of any python values only for integers\n    >>> filter_integers(['a', 3.14, 5])\n    [5]\n    >>> filter_integers([1, 2, 3, 'abc', {}, []])\n    [1, 2, 3]\n    \"\"\"\n`,
    entry_point: 'filter_integers',
  },
  {
    task_id: 'HumanEval/23',
    prompt: `def strlen(string: str) -> int:\n    \"\"\"Return length of given string\n    >>> strlen('')\n    0\n    >>> strlen('abc')\n    3\n    \"\"\"\n`,
    entry_point: 'strlen',
  },
  {
    task_id: 'HumanEval/24',
    prompt: `def largest_divisor(n: int) -> int:\n    \"\"\"For a given number n, find the largest number that divides n evenly, smaller than n\n    >>> largest_divisor(15)\n    5\n    \"\"\"\n`,
    entry_point: 'largest_divisor',
  },
  {
    task_id: 'HumanEval/25',
    prompt: `from typing import List\n\ndef factorize(n: int) -> List[int]:\n    \"\"\"Return list of prime factors of given integer in the order from smallest to largest.\n    Each of the factors should be listed number of times corresponding to how many times it appears in factorization.\n    Input number should be equal to the product of all factors\n    >>> factorize(8)\n    [2, 2, 2]\n    >>> factorize(25)\n    [5, 5]\n    >>> factorize(70)\n    [2, 5, 7]\n    \"\"\"\n`,
    entry_point: 'factorize',
  },
  {
    task_id: 'HumanEval/26',
    prompt: `from typing import List\n\ndef remove_duplicates(numbers: List[int]) -> List[int]:\n    \"\"\"From a list of integers, remove all elements that occur more than once.\n    Keep order of elements left the same as in the input.\n    >>> remove_duplicates([1, 2, 3, 2, 4])\n    [1, 3, 4]\n    \"\"\"\n`,
    entry_point: 'remove_duplicates',
  },
  {
    task_id: 'HumanEval/27',
    prompt: `def flip_case(string: str) -> str:\n    \"\"\"For a given string, flip lowercase characters to uppercase and uppercase to lowercase.\n    >>> flip_case('Hello')\n    'hELLO'\n    \"\"\"\n`,
    entry_point: 'flip_case',
  },
  {
    task_id: 'HumanEval/28',
    prompt: `from typing import List\n\ndef concatenate(strings: List[str]) -> str:\n    \"\"\"Concatenate list of strings into a single string\n    >>> concatenate([])\n    ''\n    >>> concatenate(['a', 'b', 'c'])\n    'abc'\n    \"\"\"\n`,
    entry_point: 'concatenate',
  },
  {
    task_id: 'HumanEval/29',
    prompt: `from typing import List\n\ndef filter_by_prefix(strings: List[str], prefix: str) -> List[str]:\n    \"\"\"Filter an input list of strings only for ones that start with a given prefix.\n    >>> filter_by_prefix([], 'a')\n    []\n    >>> filter_by_prefix(['abc', 'bcd', 'cde', 'array'], 'a')\n    ['abc', 'array']\n    \"\"\"\n`,
    entry_point: 'filter_by_prefix',
  },
  {
    task_id: 'HumanEval/30',
    prompt: `def get_positive(l: list):\n    \"\"\"Return only positive numbers in the list.\n    >>> get_positive([-1, 2, -4, 5, 6])\n    [2, 5, 6]\n    >>> get_positive([5, 3, -5, 2, -3, 3, 9, 0, 123, 1, -10])\n    [5, 3, 2, 3, 9, 123, 1]\n    \"\"\"\n`,
    entry_point: 'get_positive',
  },
  {
    task_id: 'HumanEval/31',
    prompt: `def is_prime(n):\n    \"\"\"Return true if a given number is prime, and false otherwise.\n    >>> is_prime(6)\n    False\n    >>> is_prime(101)\n    True\n    >>> is_prime(11)\n    True\n    >>> is_prime(13441)\n    True\n    >>> is_prime(61)\n    True\n    >>> is_prime(4)\n    False\n    >>> is_prime(1)\n    False\n    \"\"\"\n`,
    entry_point: 'is_prime',
  },
  {
    task_id: 'HumanEval/32',
    prompt: `import math\n\ndef poly(xs: list, x: float):\n    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])\n\ndef find_zero(xs: list):\n    \"\"\"xs are coefficients of a polynomial. find_zero find x such that poly(x) = 0.\n    find_zero returns only one zero point, even if there are many.\n    Moreover, find_zero only takes list xs having even number of coefficients\n    and largest non zero coefficient as it guarantees a solution.\n    >>> round(find_zero([1, 2]), 2)\n    -0.5\n    >>> round(find_zero([-6, 11, -6, 1]), 2)\n    1.0\n    \"\"\"\n`,
    entry_point: 'find_zero',
  },
  {
    task_id: 'HumanEval/33',
    prompt: `def sort_third(l: list):\n    \"\"\"This function takes a list l and returns a list l' such that\n    l' is identical to l in the indices that are not divisible by three, while its values at the indices that are divisible by three are equal\n    to the values of the corresponding indices of l, but sorted.\n    >>> sort_third([1, 2, 3])\n    [1, 2, 3]\n    >>> sort_third([5, 6, 3, 4, 8, 9, 2])\n    [2, 6, 3, 4, 8, 9, 5]\n    \"\"\"\n`,
    entry_point: 'sort_third',
  },
  {
    task_id: 'HumanEval/34',
    prompt: `def unique(l: list):\n    \"\"\"Return sorted unique elements in a list\n    >>> unique([5, 3, 5, 2, 3, 3, 9, 0, 123])\n    [0, 2, 3, 5, 9, 123]\n    \"\"\"\n`,
    entry_point: 'unique',
  },
  {
    task_id: 'HumanEval/35',
    prompt: `def max_element(l: list):\n    \"\"\"Return maximum element in the list.\n    >>> max_element([1, 2, 3])\n    3\n    >>> max_element([5, 3, -5, 2, -3, 3, 9, 0, 123, 1, -10])\n    123\n    \"\"\"\n`,
    entry_point: 'max_element',
  },
  {
    task_id: 'HumanEval/36',
    prompt: `def fizz_buzz(n: int):\n    \"\"\"Return the number of times the digit 7 appears in integers less than n which are divisible by 11 or 13.\n    >>> fizz_buzz(50)\n    0\n    >>> fizz_buzz(78)\n    2\n    >>> fizz_buzz(79)\n    3\n    \"\"\"\n`,
    entry_point: 'fizz_buzz',
  },
  {
    task_id: 'HumanEval/37',
    prompt: `def sort_even(l: list):\n    \"\"\"This function takes a list l and returns a list l' such that\n    l' is identical to l in the odd indices, while its values at the even indices are equal\n    to the values of the even indices of l, but sorted.\n    >>> sort_even([1, 2, 3])\n    [1, 2, 3]\n    >>> sort_even([5, 6, 3, 4, 8, 9, 2])\n    [2, 6, 3, 4, 5, 9, 8]\n    \"\"\"\n`,
    entry_point: 'sort_even',
  },
  {
    task_id: 'HumanEval/38',
    prompt: `def encode_cyclic(s: str):\n    groups = [s[(3 * i):min((3 * i + 3), len(s))] for i in range((len(s) + 2) // 3)]\n    groups = [(group[1:] + group[0]) if len(group) == 3 else group for group in groups]\n    return "".join(groups)\n\ndef decode_cyclic(s: str):\n    \"\"\"takes as input string which is encoded with encode_cyclic function. Returns decoded string.\"\"\"\n`,
    entry_point: 'decode_cyclic',
  },
  {
    task_id: 'HumanEval/39',
    prompt: `def prime_fib(n: int):\n    \"\"\"prime_fib returns n-th number that is a Fibonacci number and it's also prime.\n    >>> prime_fib(1)\n    2\n    >>> prime_fib(2)\n    3\n    >>> prime_fib(3)\n    5\n    >>> prime_fib(4)\n    13\n    >>> prime_fib(5)\n    89\n    \"\"\"\n`,
    entry_point: 'prime_fib',
  },
  {
    task_id: 'HumanEval/40',
    prompt: `def triples_sum_to_zero(l: list):\n    \"\"\"triples_sum_to_zero takes a list of integers as an input.\n    it returns True if there are three distinct elements in the list that sum to zero, and False otherwise.\n    >>> triples_sum_to_zero([1, 3, 5, 0])\n    False\n    >>> triples_sum_to_zero([1, 3, -2, 1])\n    True\n    >>> triples_sum_to_zero([1, 2, 3, 7])\n    False\n    >>> triples_sum_to_zero([2, 4, -5, 3, 9, 7])\n    True\n    >>> triples_sum_to_zero([1])\n    False\n    \"\"\"\n`,
    entry_point: 'triples_sum_to_zero',
  },
  {
    task_id: 'HumanEval/41',
    prompt: `def car_race_collision(n: int):\n    \"\"\"Imagine a road that's a perfectly straight infinitely long line.\n    n cars are driving left to right; simultaneously, a different set of n cars\n    are driving right to left. The two sets of cars start out being very far from\n    each other. All cars move in the same speed. Two cars are said to collide\n    when a car that's moving left to right hits a car that's moving right to left.\n    However, the cars are infinitely sturdy and strong; as a result, they continue moving\n    in their trajectory as if they did not collide.\n    This function outputs the number of such collisions.\n    \"\"\"\n`,
    entry_point: 'car_race_collision',
  },
  {
    task_id: 'HumanEval/42',
    prompt: `def incr_list(l: list):\n    \"\"\"Return list with elements incremented by 1.\n    >>> incr_list([1, 2, 3])\n    [2, 3, 4]\n    >>> incr_list([5, 3, 5, 2, 3, 3, 9, 0, 123])\n    [6, 4, 6, 3, 4, 4, 10, 1, 124]\n    \"\"\"\n`,
    entry_point: 'incr_list',
  },
  {
    task_id: 'HumanEval/43',
    prompt: `def pairs_sum_to_zero(l):\n    \"\"\"pairs_sum_to_zero takes a list of integers as an input.\n    it returns True if there are two distinct elements in the list that sum to zero, and False otherwise.\n    >>> pairs_sum_to_zero([1, 3, 5, 0])\n    False\n    >>> pairs_sum_to_zero([1, 3, -2, 1])\n    False\n    >>> pairs_sum_to_zero([1, 2, 3, 7])\n    False\n    >>> pairs_sum_to_zero([2, 4, -5, 3, 5, 7])\n    True\n    >>> pairs_sum_to_zero([1])\n    False\n    \"\"\"\n`,
    entry_point: 'pairs_sum_to_zero',
  },
  {
    task_id: 'HumanEval/44',
    prompt: `def change_base(x: int, base: int):\n    \"\"\"Change numerical base of input number x to base.\n    return string representation after the conversion.\n    base numbers are less than 10.\n    >>> change_base(8, 3)\n    '22'\n    >>> change_base(8, 2)\n    '1000'\n    >>> change_base(7, 2)\n    '111'\n    \"\"\"\n`,
    entry_point: 'change_base',
  },
  {
    task_id: 'HumanEval/45',
    prompt: `def triangle_area(a, h):\n    \"\"\"Given length of a side and high return area for a triangle.\n    >>> triangle_area(5, 3)\n    7.5\n    \"\"\"\n`,
    entry_point: 'triangle_area',
  },
  {
    task_id: 'HumanEval/46',
    prompt: `def fib4(n: int):\n    \"\"\"The Fib4 number sequence is a sequence similar to the Fibbonacci sequence that's defined as follows:\n    fib4(0) -> 0\n    fib4(1) -> 0\n    fib4(2) -> 2\n    fib4(3) -> 0\n    fib4(n) -> fib4(n-1) + fib4(n-2) + fib4(n-3) + fib4(n-4).\n    Please write a function to efficiently compute the n-th element of the fib4 number sequence. Do not use recursion.\n    >>> fib4(5)\n    4\n    >>> fib4(6)\n    8\n    >>> fib4(7)\n    14\n    \"\"\"\n`,
    entry_point: 'fib4',
  },
  {
    task_id: 'HumanEval/47',
    prompt: `def median(l: list):\n    \"\"\"Return median of elements in the list l.\n    >>> median([3, 1, 2, 4, 5])\n    3\n    >>> median([-10, 4, 6, 1000, 10, 20])\n    15.0\n    \"\"\"\n`,
    entry_point: 'median',
  },
  {
    task_id: 'HumanEval/48',
    prompt: `def is_palindrome(text: str):\n    \"\"\"Checks if given string is a palindrome\n    >>> is_palindrome('')\n    True\n    >>> is_palindrome('aba')\n    True\n    >>> is_palindrome('aaaaa')\n    True\n    >>> is_palindrome('zbcd')\n    False\n    \"\"\"\n`,
    entry_point: 'is_palindrome',
  },
  {
    task_id: 'HumanEval/49',
    prompt: `def modp(n: int, p: int):\n    \"\"\"Return 2^n modulo p (be aware of numerics).\n    >>> modp(3, 5)\n    3\n    >>> modp(1101, 101)\n    2\n    >>> modp(0, 101)\n    1\n    >>> modp(3, 11)\n    8\n    >>> modp(100, 101)\n    1\n    \"\"\"\n`,
    entry_point: 'modp',
  },
];

// ── Strict validator ────────────────────────────────────────────────

export type FailReason = 'empty' | 'too_short' | 'too_long' | 'no_entry_point' | 'refusal' | 'no_logic' | null;

export function validateSolution(task: HumanEvalTask, output: string): boolean {
  return getFailReason(task, output) === null;
}

export function getFailReason(task: HumanEvalTask, output: string): FailReason {
  if (!output || output.trim().length === 0) return 'empty';

  const trimmed = output.trim();

  // Length checks
  if (trimmed.length < 20) return 'too_short';
  if (trimmed.length > 5000) return 'too_long';

  // Refusal markers
  const lower = trimmed.toLowerCase();
  const refusals = ['i cannot', "i'm sorry", 'as an ai', 'i apologize', 'i am unable'];
  for (const r of refusals) {
    if (lower.includes(r)) return 'refusal';
  }

  // Must contain the entry_point function name OR be a plausible function body
  // (the model may return just the body without repeating the def signature)
  const hasEntryPoint = trimmed.includes(task.entry_point);
  const isBodyOnly = !trimmed.includes('def ') && (lower.includes('return') || lower.includes('for ') || lower.includes('if '));
  if (!hasEntryPoint && !isBodyOnly) return 'no_entry_point';

  // Must contain at least one logic keyword (return, if, for, while, or assignment)
  const hasLogic =
    lower.includes('return ') || lower.includes('return\n') ||
    lower.includes('if ') || lower.includes('for ') ||
    lower.includes('while ') || /\w\s*=\s*\w/.test(trimmed);
  if (!hasLogic) return 'no_logic';

  return null; // passed
}
