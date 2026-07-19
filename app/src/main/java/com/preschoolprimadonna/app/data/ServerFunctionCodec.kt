package com.preschoolprimadonna.app.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.putJsonArray

class ServerFunctionCodec(private val json: Json) {
    fun requestEnvelope(value: JsonElement): String {
        val serializer = Encoder()
        return buildJsonObject {
            put("t", serializer.encode(value))
            put("f", JsonPrimitive(63))
            put("m", JsonArray(emptyList()))
        }.toString()
    }

    fun decode(payload: String): JsonElement {
        val root = json.parseToJsonElement(payload)
        return Decoder().decode(root)
    }

    private class Encoder {
        private var nextId = 0

        fun encode(value: JsonElement): JsonObject {
            return when (value) {
                JsonNull -> special(0)
                is JsonPrimitive -> encodePrimitive(value)
                is JsonArray -> {
                    val id = nextId++
                    buildJsonObject {
                        put("t", JsonPrimitive(9))
                        put("i", JsonPrimitive(id))
                        putJsonArray("a") {
                            value.forEach { add(encode(it)) }
                        }
                        put("o", JsonPrimitive(0))
                    }
                }
                is JsonObject -> {
                    val id = nextId++
                    val entries = value.entries.filter { it.value !is JsonNull }
                    buildJsonObject {
                        put("t", JsonPrimitive(10))
                        put("i", JsonPrimitive(id))
                        put("p", buildJsonObject {
                            putJsonArray("k") {
                                entries.forEach { add(JsonPrimitive(escape(it.key))) }
                            }
                            putJsonArray("v") {
                                entries.forEach { add(encode(it.value)) }
                            }
                        })
                        put("o", JsonPrimitive(0))
                    }
                }
            }
        }

        private fun encodePrimitive(value: JsonPrimitive): JsonObject {
            value.booleanOrNull?.let { return special(if (it) 2 else 3) }
            if (value.isString) {
                return buildJsonObject {
                    put("t", JsonPrimitive(1))
                    put("s", JsonPrimitive(escape(value.content)))
                }
            }
            return buildJsonObject {
                put("t", JsonPrimitive(0))
                put("s", JsonPrimitive(value.doubleOrNull ?: 0.0))
            }
        }

        private fun special(code: Int): JsonObject {
            return buildJsonObject {
                put("t", JsonPrimitive(2))
                put("s", JsonPrimitive(code))
            }
        }
    }

    private class Decoder {
        private val refs = mutableMapOf<Int, JsonElement>()

        fun decode(node: JsonElement): JsonElement {
            if (node !is JsonObject) return node
            val tag = node["t"]?.jsonPrimitive?.intOrNull ?: return node
            return when (tag) {
                0 -> decodeNumber(node["s"]?.jsonPrimitive)
                1 -> JsonPrimitive(unescape(node["s"]?.jsonPrimitive?.contentOrNull.orEmpty()))
                2 -> decodeSpecial(node["s"]?.jsonPrimitive?.int ?: 1)
                4 -> refs[node["i"]?.jsonPrimitive?.intOrNull] ?: JsonNull
                5 -> JsonPrimitive(node["s"]?.jsonPrimitive?.contentOrNull.orEmpty())
                9 -> decodeArray(node)
                10, 11 -> decodeObject(node)
                25 -> decodeCustom(node)
                else -> JsonNull
            }
        }

        private fun decodeNumber(value: JsonPrimitive?): JsonPrimitive {
            val raw = value?.contentOrNull.orEmpty()
            raw.toLongOrNull()?.let { return JsonPrimitive(it) }
            return JsonPrimitive(value?.doubleOrNull ?: 0.0)
        }

        private fun decodeSpecial(code: Int): JsonElement {
            return when (code) {
                0 -> JsonNull
                2 -> JsonPrimitive(true)
                3 -> JsonPrimitive(false)
                4 -> JsonPrimitive(-0.0)
                5, 6, 7 -> JsonNull
                else -> JsonNull
            }
        }

        private fun decodeArray(node: JsonObject): JsonArray {
            val values = node["a"]?.jsonArray ?: JsonArray(emptyList())
            val decoded = buildJsonArray {
                values.forEach { add(decode(it)) }
            }
            node["i"]?.jsonPrimitive?.intOrNull?.let { refs[it] = decoded }
            return decoded
        }

        private fun decodeObject(node: JsonObject): JsonObject {
            val props = node["p"]?.jsonObject ?: JsonObject(emptyMap())
            val keys = props["k"]?.jsonArray ?: JsonArray(emptyList())
            val values = props["v"]?.jsonArray ?: JsonArray(emptyList())
            val decoded = buildJsonObject {
                keys.forEachIndexed { index, keyNode ->
                    val key = when (keyNode) {
                        is JsonPrimitive -> unescape(keyNode.content)
                        else -> decode(keyNode).jsonPrimitive.content
                    }
                    put(key, values.getOrNull(index)?.let(::decode) ?: JsonNull)
                }
            }
            node["i"]?.jsonPrimitive?.intOrNull?.let { refs[it] = decoded }
            return decoded
        }

        private fun decodeCustom(node: JsonObject): JsonObject {
            val source = node["s"]?.jsonObject ?: JsonObject(emptyMap())
            val decoded = buildJsonObject {
                source.forEach { (key, value) -> put(key, decode(value)) }
                node["c"]?.jsonPrimitive?.contentOrNull?.let { put("custom_type", JsonPrimitive(unescape(it))) }
            }
            node["i"]?.jsonPrimitive?.intOrNull?.let { refs[it] = decoded }
            return decoded
        }
    }
}

private fun escape(value: String): String = buildString {
    value.forEach { char ->
        when (char) {
            '"' -> append("\\\"")
            '\\' -> append("\\\\")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '\b' -> append("\\b")
            '\t' -> append("\\t")
            '\u000C' -> append("\\f")
            '<' -> append("\\x3C")
            '\u2028' -> append("\\u2028")
            '\u2029' -> append("\\u2029")
            else -> append(char)
        }
    }
}

private fun unescape(value: String): String = buildString {
    var index = 0
    while (index < value.length) {
        val char = value[index]
        if (char != '\\' || index == value.lastIndex) {
            append(char)
            index += 1
            continue
        }
        when (val next = value[index + 1]) {
            '"' -> append('"')
            '\\' -> append('\\')
            'n' -> append('\n')
            'r' -> append('\r')
            'b' -> append('\b')
            't' -> append('\t')
            'f' -> append('\u000C')
            'x' -> {
                val hex = value.drop(index + 2).take(2)
                if (hex.equals("3C", ignoreCase = true)) {
                    append('<')
                    index += 2
                } else {
                    append("\\x$hex")
                    index += hex.length
                }
            }
            'u' -> {
                val hex = value.drop(index + 2).take(4)
                val code = hex.toIntOrNull(16)
                if (code != null) {
                    append(code.toChar())
                    index += 4
                } else {
                    append("\\u$hex")
                    index += hex.length
                }
            }
            else -> append(next)
        }
        index += 2
    }
}
