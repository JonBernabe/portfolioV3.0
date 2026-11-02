import Text from '../Text/Text'

export default function NoWebGL() {
  return (
    <div className="fixed inset-0 grid place-items-center p-6 text-center">
      <div>
        <Text as="h2" className="font-display text-[24px] font-bold">
          JON.
        </Text>
        <Text className="mt-2.5 text-[13px] text-dim">
          Your browser couldn't start WebGL. Use the buttons to browse.
        </Text>
      </div>
    </div>
  )
}
