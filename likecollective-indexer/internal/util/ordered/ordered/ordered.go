package ordered

import "cmp"

type Comparator[T any] func(a T, b T) int

func CombineComparators[T any](cmps ...Comparator[T]) Comparator[T] {
	return func(a, b T) int {
		for _, cmp := range cmps {
			res := cmp(a, b)
			if res != 0 {
				return res
			}
		}
		return 0
	}
}

func Normalize[T cmp.Ordered](a T, b T) int {
	if a < b {
		return -1
	} else if a == b {
		return 0
	}
	return 1
}
