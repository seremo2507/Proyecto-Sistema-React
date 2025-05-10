import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: W } = Dimensions.get('window');
const CIRCLE_DIAM = 28;

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0140CD' },
  formWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    justifyContent: 'center',
  },

  stepper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  circle: { width: CIRCLE_DIAM, height: CIRCLE_DIAM, borderRadius: CIRCLE_DIAM/2, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  circleActive: { backgroundColor: '#fff' },
  circleText: { color: '#666' },
  circleTextActive: { color: '#0140CD' },
  line: { flex: 1, height: 4, backgroundColor: '#ccc' },
  lineActive: { backgroundColor: '#fff' },

  labelStep: { fontSize: 12, color: '#eee' },
  labelActive: { color: '#fff' },

  scroll: { paddingVertical: 16 },
  card: { backgroundColor: '#0140CD', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  labelWhite: { fontSize: 14, color: '#fff', marginBottom: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  input: { flex: 1, marginLeft: 8, color: '#333' },
  textarea: { flex: 1, marginLeft: 8, color: '#333', height: 60, textAlignVertical: 'top' },
  map: { width: W - 48, height: 140, borderRadius: 8, marginBottom: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 8, width: '80%', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  modalOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalOptionText: { fontSize: 16, color: '#333', textAlign: 'center' },
  modalCancelBtn: { marginTop: 12, backgroundColor: '#dc3545', borderRadius: 6, padding: 10 },
  modalCancelText: { color: '#fff', fontWeight: '700', textAlign: 'center' },

  nav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingBottom: 24 },
  navBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 },
  navText: { color: '#0140CD', fontWeight: '600', marginHorizontal: 6 },
  finishBtn: { backgroundColor: '#28a745' },

  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },

  // Si no los tienes, también añade:
  twoColumns: { flexDirection: 'row' },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  counterBtn: {
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  counterText: { fontSize: 18, color: '#0140CD' },
  counterValue: { marginHorizontal: 12, fontSize: 16, color: '#fff' },

  buttonAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonAddText: {
    marginLeft: 6,
    color: '#fff',
    fontWeight: '600',
  },

  cardSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#005bb5',
  },
  cardTitleWhite: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#fff',
  },

  transportRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  transportCard: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  descText: {
    marginTop: 8,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
});

