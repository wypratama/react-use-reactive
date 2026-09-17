/* oxlint-disable react/rules-of-hooks */
/* oxlint-disable react-hooks/rules-of-hooks */
import useReactive from '../index.js';

// Plain object literal root.
const literal = useReactive({
  count: 0,
  user: {
    name: '',
  },
});
literal.count++;
literal.user.name = 'Wicak';

// Named interface root (must remain assignable: no index-signature constraint).
interface State {
  count: number;
  user: {
    name: string;
  };
}
const initial: State = { count: 0, user: { name: '' } };
const fromInterface = useReactive(initial);
fromInterface.count++;
fromInterface.user.name = 'Wicak';

// Array root.
const list = useReactive([1, 2, 3]);
list.push(4);

// Null-prototype root remains supported.
const nullProto = useReactive(Object.assign(Object.create(null), { a: 1 }));
nullProto.a = 2;

export { literal, fromInterface, list, nullProto };
