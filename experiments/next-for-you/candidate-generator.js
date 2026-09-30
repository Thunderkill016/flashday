/* Thin re-export shim (mission 008C §26): the approved semantics live in
 * src/vnext/next-for-you/candidate-generator.js — this path stays importable so the
 * experiment harness and historical imports can never drift into a
 * second implementation. */
export * from '../../src/vnext/next-for-you/candidate-generator.js';
