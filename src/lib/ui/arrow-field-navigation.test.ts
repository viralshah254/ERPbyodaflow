import { afterEach, expect, it } from "vitest";
import { nextArrowField } from "./arrow-field-navigation";

afterEach(() => {
  document.body.innerHTML = "";
});

it("moves down the same quantity column and leaves a price column alone", () => {
  document.body.innerHTML = `
    <table>
      <tbody>
        <tr><td><input id="q1" data-line-field="qty" /></td><td><input id="p1" data-line-field="price" /></td></tr>
        <tr><td colspan="2"><input id="note" /></td></tr>
        <tr><td><input id="q2" data-line-field="qty" /></td><td><input id="p2" data-line-field="price" /></td></tr>
      </tbody>
    </table>`;
  const q1 = document.getElementById("q1") as HTMLInputElement;
  const q2 = document.getElementById("q2") as HTMLInputElement;
  const p1 = document.getElementById("p1") as HTMLInputElement;
  expect(nextArrowField(q1, 1)).toBe(q2);
  expect(nextArrowField(q2, -1)).toBe(q1);
  expect(nextArrowField(p1, 1)?.id).toBe("p2");
  expect(nextArrowField(q1, -1)).toBeNull();
});

it("moves transfer quantities by product, not by changing the number", () => {
  document.body.innerHTML = `
    <table>
      <tbody>
        <tr><td><input id="a" data-transfer-qty="a" type="number" /></td></tr>
        <tr><td><input id="b" data-transfer-qty="b" type="number" /></td></tr>
      </tbody>
    </table>`;
  const a = document.getElementById("a") as HTMLInputElement;
  expect(nextArrowField(a, 1)?.id).toBe("b");
});

it("keeps repeated fields in their own column outside a table", () => {
  document.body.innerHTML = `
    <div data-arrow-nav>
      <input id="good-1" data-arrow-field="good" />
      <input id="bad-1" data-arrow-field="damaged" />
      <input id="good-2" data-arrow-field="good" />
      <input id="bad-2" data-arrow-field="damaged" />
    </div>`;
  const good1 = document.getElementById("good-1") as HTMLInputElement;
  const bad1 = document.getElementById("bad-1") as HTMLInputElement;
  expect(nextArrowField(good1, 1)?.id).toBe("good-2");
  expect(nextArrowField(bad1, 1)?.id).toBe("bad-2");
});

it("moves header fields in order and skips an open product search", () => {
  document.body.innerHTML = `
    <form data-arrow-nav>
      <input id="date" type="date" />
      <input id="lpo" />
      <div role="listbox"><input id="search" role="combobox" /></div>
    </form>`;
  const date = document.getElementById("date") as HTMLInputElement;
  const lpo = document.getElementById("lpo") as HTMLInputElement;
  const search = document.getElementById("search") as HTMLInputElement;
  expect(nextArrowField(date, 1)).toBe(lpo);
  expect(nextArrowField(search, 1)).toBeNull();
});

it("uses the same table cell when a row has no field name", () => {
  document.body.innerHTML = `
    <table>
      <tbody>
        <tr><td>Cake</td><td><input id="r1" type="number" /></td></tr>
        <tr><td>Bun</td><td><input id="r2" type="number" /></td></tr>
      </tbody>
    </table>`;
  const first = document.getElementById("r1") as HTMLInputElement;
  expect(nextArrowField(first, 1)?.id).toBe("r2");
});
